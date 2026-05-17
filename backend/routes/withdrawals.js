const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getWithdrawalFee, getMinWithdrawal } = require('../services/vipService');
const { sendWithdrawalNotification } = require('../services/emailService');

// Helper to get dynamic withdrawal config
const getDynamicMethods = async () => {
    const [settings] = await pool.query('SELECT setting_value FROM site_settings WHERE setting_key = "withdrawal_methods"');
    if (settings.length > 0 && settings[0].setting_value) {
        try { return JSON.parse(settings[0].setting_value); } catch (e) { return []; }
    }
    return [];
};

const router = express.Router();

// Get withdrawal info (fees, minimum, methods)
router.get('/info', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user balance
        const [users] = await pool.query(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        // Get referral count
        const [referralCount] = await pool.query(
            'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
            [userId]
        );

        const balance = parseFloat(users[0].balance);
        const minWithdrawal = await getMinWithdrawal(userId);
        const referrals = parseInt(referralCount[0].count) || 0;
        const requiredReferrals = 5;
        const canWithdraw = referrals >= requiredReferrals;

        // Get fee info for current balance
        const feeInfo = await getWithdrawalFee(userId, balance);

        // Get dynamic withdrawal methods
        const dynamicMethods = await getDynamicMethods();

        // Get coin exchange rate
        const [settingsRate] = await pool.query('SELECT setting_value FROM site_settings WHERE setting_key = "coin_exchange_rate"');
        const coinExchangeRate = settingsRate.length > 0 ? parseFloat(settingsRate[0].setting_value) : 1000;

        const baseMethods = [
            { id: 'jazzcash', name: 'JazzCash', icon: 'phone', fields: ['accountNumber'] },
            { id: 'easypaisa', name: 'Easypaisa', icon: 'phone', fields: ['accountNumber'] },
            { id: 'usdt_trc20', name: 'USDT (TRC20)', icon: 'wallet', fields: ['walletAddress'] },
            { id: 'binance_pay', name: 'Binance Pay', icon: 'currency-dollar', fields: ['binanceId', 'email'] }
        ];

        // Merge base fields with dynamic config (minAmount, feePercent)
        const paymentMethods = baseMethods.map(base => {
            const dynamic = dynamicMethods.find(d => d.id === base.id);
            return {
                ...base,
                minAmount: dynamic?.minAmount !== undefined ? dynamic.minAmount : minWithdrawal,
                feePercent: dynamic?.feePercent !== undefined ? dynamic.feePercent : feeInfo.feePercentage
            };
        });

        res.json({
            balance,
            minWithdrawal,
            feePercentage: feeInfo.feePercentage,
            isVIP: feeInfo.isVIP,
            // Referral requirement info
            referralCount: referrals,
            requiredReferrals,
            canWithdraw,
            paymentMethods,
            coinExchangeRate
        });

    } catch (error) {
        console.error('Get withdrawal info error:', error);
        res.status(500).json({ error: 'Failed to get withdrawal info' });
    }
});

// Calculate withdrawal fee
router.post('/calculate', authMiddleware, async (req, res) => {
    try {
        const { amount, method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const feeInfo = await getWithdrawalFee(req.user.id, parseFloat(amount));
        let finalFee = feeInfo.fee;
        let finalFeePercentage = feeInfo.feePercentage;
        let finalNetAmount = feeInfo.netAmount;

        if (method) {
            const dynamicMethods = await getDynamicMethods();
            const config = dynamicMethods.find(d => d.id === method);
            if (config && config.feePercent !== undefined) {
                finalFeePercentage = config.feePercent;
                finalFee = parseFloat(amount) * (finalFeePercentage / 100);
                finalNetAmount = parseFloat(amount) - finalFee;
            }
        }

        res.json({
            amount: parseFloat(amount),
            fee: finalFee,
            feePercentage: finalFeePercentage,
            netAmount: finalNetAmount,
            isVIP: feeInfo.isVIP
        });

    } catch (error) {
        console.error('Calculate fee error:', error);
        res.status(500).json({ error: 'Failed to calculate fee' });
    }
});

// Request withdrawal
router.post('/request', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { amount, paymentMethod, paymentDetails } = req.body;
        const userId = req.user.id;

        // Validation
        if (!amount || !paymentMethod || !paymentDetails) {
            await connection.rollback();
            return res.status(400).json({ error: 'Amount, payment method, and payment details are required' });
        }

        const requestAmount = parseFloat(amount);

        if (requestAmount <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Check balance
        const [users] = await connection.query(
            'SELECT balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );

        const balance = parseFloat(users[0].balance);

        // Check referral requirement (5 referrals needed)
        const [referralCount] = await connection.query(
            'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
            [userId]
        );

        if (parseInt(referralCount[0].count) < 5) {
            await connection.rollback();
            return res.status(400).json({
                error: 'You need at least 5 referrals to withdraw. Share your referral link to invite friends!',
                referralCount: parseInt(referralCount[0].count),
                required: 5
            });
        }

        if (requestAmount > balance) {
            await connection.rollback();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Check minimum withdrawal
        let minWithdrawal = await getMinWithdrawal(userId);
        
        // Apply dynamic method overrides
        const dynamicMethods = await getDynamicMethods();
        const config = dynamicMethods.find(d => d.id === paymentMethod);
        if (config) {
            if (config.minAmount !== undefined) minWithdrawal = config.minAmount;
        }

        if (requestAmount < minWithdrawal) {
            await connection.rollback();
            return res.status(400).json({
                error: `Minimum withdrawal amount for this method is $${minWithdrawal.toFixed(2)}`,
                minWithdrawal
            });
        }

        // Check for pending withdrawal
        const [pending] = await connection.query(
            'SELECT id FROM withdrawals WHERE user_id = ? AND status IN ("pending", "processing")',
            [userId]
        );

        if (pending.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'You already have a pending withdrawal request' });
        }

        // Calculate fee
        const feeInfo = await getWithdrawalFee(userId, requestAmount);
        let finalFee = feeInfo.fee;
        let finalNetAmount = feeInfo.netAmount;

        if (config && config.feePercent !== undefined) {
            finalFee = requestAmount * (config.feePercent / 100);
            finalNetAmount = requestAmount - finalFee;
        }

        // Deduct from balance and add to pending
        await connection.query(
            'UPDATE users SET balance = balance - ?, pending_balance = pending_balance + ? WHERE id = ?',
            [requestAmount, finalNetAmount, userId]
        );

        // Create withdrawal request
        const [result] = await connection.query(
            `INSERT INTO withdrawals (user_id, amount, fee, net_amount, payment_method, payment_details, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [userId, requestAmount, finalFee, finalNetAmount, paymentMethod, JSON.stringify(paymentDetails)]
        );

        // Create notification
        await connection.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES (?, 'Withdrawal Requested', ?, 'info')`,
            [userId, `Your withdrawal request for $${finalNetAmount.toFixed(2)} is pending approval.`]
        );

        // Send email notification
        await sendWithdrawalNotification(req.user.email, 'pending', finalNetAmount);

        await connection.commit();

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawal: {
                id: result.insertId,
                amount: requestAmount,
                fee: finalFee,
                netAmount: finalNetAmount,
                status: 'pending'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Request withdrawal error:', error);
        res.status(500).json({ error: 'Failed to submit withdrawal request' });
    } finally {
        connection.release();
    }
});

// Get withdrawal history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM withdrawals WHERE user_id = ?';
        const params = [req.user.id];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [withdrawals] = await pool.query(query, params);

        const [total] = await pool.query(
            'SELECT COUNT(*) as count FROM withdrawals WHERE user_id = ?' + (status ? ' AND status = ?' : ''),
            status ? [req.user.id, status] : [req.user.id]
        );

        res.json({
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: parseFloat(w.amount),
                fee: parseFloat(w.fee),
                netAmount: parseFloat(w.net_amount),
                paymentMethod: w.payment_method,
                paymentDetails: JSON.parse(w.payment_details),
                status: w.status,
                adminNotes: w.admin_notes,
                createdAt: w.created_at,
                processedAt: w.processed_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count,
                pages: Math.ceil(total[0].count / limit)
            }
        });

    } catch (error) {
        console.error('Get withdrawal history error:', error);
        res.status(500).json({ error: 'Failed to get withdrawal history' });
    }
});

// Cancel pending withdrawal
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;

        // Get withdrawal
        const [withdrawals] = await connection.query(
            'SELECT * FROM withdrawals WHERE id = ? AND user_id = ? AND status = "pending" FOR UPDATE',
            [id, userId]
        );

        if (withdrawals.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Pending withdrawal not found' });
        }

        const withdrawal = withdrawals[0];

        // Return funds
        await connection.query(
            'UPDATE users SET balance = balance + ?, pending_balance = pending_balance - ? WHERE id = ?',
            [parseFloat(withdrawal.amount), parseFloat(withdrawal.net_amount), userId]
        );

        // Update withdrawal status
        await connection.query(
            'UPDATE withdrawals SET status = "rejected", admin_notes = "Cancelled by user" WHERE id = ?',
            [id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Withdrawal cancelled successfully',
            refundedAmount: parseFloat(withdrawal.amount)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Cancel withdrawal error:', error);
        res.status(500).json({ error: 'Failed to cancel withdrawal' });
    } finally {
        connection.release();
    }
});

module.exports = router;
