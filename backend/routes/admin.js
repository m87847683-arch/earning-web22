const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { adminAuth, superAdminOnly } = require('../middleware/adminAuth');
const { sendWithdrawalNotification } = require('../services/emailService');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [admins] = await pool.query(
            'SELECT * FROM admin_users WHERE email = ? AND status = "active"',
            [email]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { adminId: admin.id, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                username: admin.username,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // Users stats
        const [userStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today
            FROM users
        `);

        // Earnings stats
        const [earningsStats] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as today
            FROM earnings_logs
        `);

        // Withdrawals stats
        const [withdrawalStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as totalPaid
            FROM withdrawals
        `);

        // VIP stats
        const [vipStats] = await pool.query(`
            SELECT COUNT(*) as active FROM user_vip 
            WHERE status = 'active' AND expires_at > NOW()
        `);

        // Recent activity
        const [recentUsers] = await pool.query(`
            SELECT id, username, email, created_at FROM users 
            ORDER BY created_at DESC LIMIT 5
        `);

        const [recentWithdrawals] = await pool.query(`
            SELECT w.*, u.username FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            WHERE w.status = 'pending'
            ORDER BY w.created_at DESC LIMIT 5
        `);

        res.json({
            users: userStats[0],
            earnings: {
                total: parseFloat(earningsStats[0].total),
                today: parseFloat(earningsStats[0].today)
            },
            withdrawals: {
                total: withdrawalStats[0].total,
                pending: withdrawalStats[0].pending,
                totalPaid: parseFloat(withdrawalStats[0].totalPaid)
            },
            vipActive: vipStats[0].active,
            recentUsers,
            pendingWithdrawals: recentWithdrawals
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
    }
});

// Broadcast Announcement
router.post('/broadcast', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { title, message } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Send to all active users
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, created_at)
             SELECT id, ?, ?, 'info', NOW() FROM users WHERE status = 'active'`,
            [title, message]
        );

        res.json({ success: true, message: 'Broadcast sent successfully' });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
});

// ============ TASK MANAGEMENT ============

// Get all tasks
router.get('/tasks', adminAuth, async (req, res) => {
    try {
        const [tasks] = await pool.query(
            'SELECT * FROM tasks ORDER BY created_at DESC'
        );

        // Map field names to match frontend expectations
        const mappedTasks = tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            task_link: t.task_link,
            reward: parseFloat(t.reward),
            max_completions: t.max_completions_per_user,
            cooldown_hours: t.cooldown_hours,
            task_type: t.task_type,
            icon: t.icon,
            is_active: t.status === 'active',
            status: t.status,
            correctAnswer: t.correct_answer
        }));

        res.json(mappedTasks);

    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

// Create task
router.post('/tasks', adminAuth, async (req, res) => {
    try {
        const { title, description, taskLink, reward, maxCompletions, cooldownHours, taskType, icon, status, correctAnswer } = req.body;

        if (!title || !taskLink || !reward || !taskType) {
            return res.status(400).json({ error: 'Title, link, reward, and type are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO tasks (title, description, task_link, reward, max_completions_per_user, cooldown_hours, task_type, icon, status, correct_answer)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description || '', taskLink, reward, maxCompletions || 5, cooldownHours || 1, taskType, icon || 'task', status || 'active', correctAnswer || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Task created successfully' });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.put('/tasks/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, taskLink, reward, maxCompletions, cooldownHours, taskType, icon, status, correctAnswer } = req.body;

        await pool.query(
            `UPDATE tasks SET title = ?, description = ?, task_link = ?, reward = ?,
             max_completions_per_user = ?, cooldown_hours = ?, task_type = ?, icon = ?, status = ?, correct_answer = ?
             WHERE id = ?`,
            [title, description, taskLink, reward, maxCompletions, cooldownHours, taskType, icon, status, correctAnswer || null, id]
        );

        res.json({ message: 'Task updated successfully' });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
router.delete('/tasks/:id', adminAuth, superAdminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ============ USER MANAGEMENT ============

// Get users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, email, username, balance, total_earned, status, created_at FROM users WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (email LIKE ? OR username LIKE ? OR device_id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await pool.query(query, params);

        res.json(users);

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Update user status
router.put('/users/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'banned', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);

        res.json({ message: 'User status updated' });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Delete user completely
router.delete('/users/:id', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const userId = req.params.id;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete user-related records first to handle foreign key constraints
            const tablesWithUserRef = [
                'earnings_logs', 'login_logs', 'notifications', 
                'offerwall_transactions', 'payments', 'promo_code_uses', 
                'task_completions', 'task_locks', 'user_daily_limits', 
                'user_vip', 'vip_requests', 'withdrawals'
            ];
            
            for (const table of tablesWithUserRef) {
                try {
                    await connection.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
                } catch (err) {
                    // Ignore error if table doesn't exist in this environment
                    if (err.code !== 'ER_NO_SUCH_TABLE') {
                        throw err;
                    }
                }
            }
            
            // Referrals table has two references: referrer_id and referred_id
            await connection.query('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?', [userId, userId]);

            // Clear the referred_by foreign key in the users table for anyone referred by this user
            await connection.query('UPDATE users SET referred_by = NULL WHERE referred_by = ?', [userId]);

            // Finally delete the user
            await connection.query('DELETE FROM users WHERE id = ?', [userId]);

            await connection.commit();
            res.json({ message: 'User completely deleted from the system' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: `Failed to delete user completely: ${error.message}` });
    }
});

// Adjust user balance
router.post('/users/:id/balance', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { amount, type, reason } = req.body;
        const userId = req.params.id;

        if (!amount || !type || !['add', 'subtract'].includes(type)) {
            return res.status(400).json({ error: 'Amount and type (add/subtract) are required' });
        }

        const adjustAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);

        await pool.query(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [adjustAmount, userId]
        );

        await pool.query(
            `INSERT INTO earnings_logs (user_id, amount, source_type, description) VALUES (?, ?, 'bonus', ?)`,
            [userId, adjustAmount, reason || `Admin ${type} balance`]
        );

        res.json({ message: `Balance ${type === 'add' ? 'added' : 'subtracted'} successfully` });

    } catch (error) {
        console.error('Adjust balance error:', error);
        res.status(500).json({ error: 'Failed to adjust balance' });
    }
});

// Send notification to user
router.post('/users/:id/notify', adminAuth, async (req, res) => {
    try {
        const { title, message, type } = req.body;
        const userId = req.params.id;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, title, message, type || 'info']
        );

        res.json({ message: 'Notification sent successfully' });

    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Broadcast notification to ALL users
router.post('/users/notify-all', adminAuth, async (req, res) => {
    try {
        const { title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Insert notification for all active users
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, created_at)
             SELECT id, ?, ?, ?, NOW()
             FROM users 
             WHERE status != 'banned'`,
            [title, message, type || 'info']
        );

        res.json({ message: 'Broadcast sent successfully' });

    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
});

// ============ WITHDRAWAL MANAGEMENT ============

// Get pending withdrawals
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const [withdrawals] = await pool.query(
            `SELECT w.*, u.email, u.username FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             WHERE w.status = ?
             ORDER BY w.created_at ASC`,
            [status]
        );

        res.json(withdrawals.map(w => ({
            ...w,
            amount: parseFloat(w.amount),
            fee: parseFloat(w.fee),
            netAmount: parseFloat(w.net_amount),
            paymentDetails: JSON.parse(w.payment_details)
        })));

    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ error: 'Failed to get withdrawals' });
    }
});

// Process withdrawal
router.post('/withdrawals/:id/process', adminAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { action, notes } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Action must be approve or reject' });
        }

        const [withdrawals] = await connection.query(
            'SELECT w.*, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE w.id = ? FOR UPDATE',
            [id]
        );

        if (withdrawals.length === 0 || withdrawals[0].status !== 'pending') {
            await connection.rollback();
            return res.status(404).json({ error: 'Pending withdrawal not found' });
        }

        const withdrawal = withdrawals[0];

        if (action === 'approve') {
            await connection.query(
                `UPDATE withdrawals SET status = 'approved', admin_notes = ?, processed_at = NOW() WHERE id = ?`,
                [notes || null, id]
            );

            // Reduce pending balance
            await connection.query(
                'UPDATE users SET pending_balance = pending_balance - ? WHERE id = ?',
                [parseFloat(withdrawal.net_amount), withdrawal.user_id]
            );

            // Send notification
            await sendWithdrawalNotification(withdrawal.email, 'approved', parseFloat(withdrawal.net_amount));

        } else {
            // Reject - return funds
            await connection.query(
                `UPDATE withdrawals SET status = 'rejected', admin_notes = ?, processed_at = NOW() WHERE id = ?`,
                [notes || null, id]
            );

            await connection.query(
                'UPDATE users SET balance = balance + ?, pending_balance = pending_balance - ? WHERE id = ?',
                [parseFloat(withdrawal.amount), parseFloat(withdrawal.net_amount), withdrawal.user_id]
            );

            await sendWithdrawalNotification(withdrawal.email, 'rejected', parseFloat(withdrawal.amount));
        }

        // Create notification
        await connection.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES (?, ?, ?, ?)`,
            [
                withdrawal.user_id,
                action === 'approve' ? 'Withdrawal Approved!' : 'Withdrawal Rejected',
                action === 'approve'
                    ? `Your withdrawal of $${parseFloat(withdrawal.net_amount).toFixed(2)} has been approved.`
                    : `Your withdrawal has been rejected. $${parseFloat(withdrawal.amount).toFixed(2)} has been returned to your balance.`,
                action === 'approve' ? 'success' : 'error'
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Withdrawal ${action}d successfully`
        });

    } catch (error) {
        await connection.rollback();
        console.error('Process withdrawal error:', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
    } finally {
        connection.release();
    }
});

// ============ VIP MANAGEMENT ============

// Get VIP plans
router.get('/vip-plans', adminAuth, async (req, res) => {
    try {
        const [plans] = await pool.query('SELECT * FROM vip_plans ORDER BY price ASC');
        res.json(plans);
    } catch (error) {
        console.error('Get VIP plans error:', error);
        res.status(500).json({ error: 'Failed to get VIP plans' });
    }
});

// Update VIP plan
router.put('/vip-plans/:id', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { name, description, price, durationDays, earningBonus, feeDiscount, minWithdrawal, status } = req.body;

        await pool.query(
            `UPDATE vip_plans SET name = ?, description = ?, price = ?, duration_days = ?,
             earning_bonus = ?, fee_discount = ?, min_withdrawal = ?, status = ? WHERE id = ?`,
            [name, description, price, durationDays, earningBonus, feeDiscount, minWithdrawal, status, req.params.id]
        );

        res.json({ message: 'VIP plan updated' });

    } catch (error) {
        console.error('Update VIP plan error:', error);
        res.status(500).json({ error: 'Failed to update VIP plan' });
    }
});

// ============ SETTINGS ============

// Get settings
router.get('/settings', adminAuth, async (req, res) => {
    try {
        const [settings] = await pool.query('SELECT * FROM site_settings');

        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_type === 'number'
                ? parseFloat(s.setting_value)
                : s.setting_value;
        });

        res.json(settingsObj);

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update setting
router.put('/settings/:key', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { value } = req.body;

        await pool.query(
            'UPDATE site_settings SET setting_value = ? WHERE setting_key = ?',
            [String(value), req.params.key]
        );

        res.json({ message: 'Setting updated' });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// ==================== VIP REQUESTS ====================

// Get VIP requests
router.get('/vip-requests', adminAuth, async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const [requests] = await pool.query(
            `SELECT vr.*, u.username, u.email, vp.name as plan_name, vp.duration_days, vp.earning_bonus
             FROM vip_requests vr
             JOIN users u ON vr.user_id = u.id
             JOIN vip_plans vp ON vr.plan_id = vp.id
             WHERE vr.status = ?
             ORDER BY vr.created_at DESC`,
            [status]
        );

        res.json(requests);

    } catch (error) {
        console.error('Get VIP requests error:', error);
        res.status(500).json({ error: 'Failed to get VIP requests' });
    }
});

// Get single VIP request with screenshot
router.get('/vip-requests/:id', adminAuth, async (req, res) => {
    try {
        const [requests] = await pool.query(
            `SELECT vr.*, u.username, u.email, vp.name as plan_name, vp.duration_days, vp.earning_bonus
             FROM vip_requests vr
             JOIN users u ON vr.user_id = u.id
             JOIN vip_plans vp ON vr.plan_id = vp.id
             WHERE vr.id = ?`,
            [req.params.id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'VIP request not found' });
        }

        res.json(requests[0]);

    } catch (error) {
        console.error('Get VIP request error:', error);
        res.status(500).json({ error: 'Failed to get VIP request' });
    }
});

// Process VIP request (approve/reject)
router.post('/vip-requests/:id/process', adminAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { action, notes } = req.body;
        const requestId = req.params.id;

        if (!['approve', 'reject'].includes(action)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Get request
        const [requests] = await connection.query(
            `SELECT vr.*, vp.duration_days, vp.name as plan_name, vp.earning_bonus
             FROM vip_requests vr
             JOIN vip_plans vp ON vr.plan_id = vp.id
             WHERE vr.id = ? AND vr.status = 'pending'`,
            [requestId]
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'VIP request not found or already processed' });
        }

        const request = requests[0];
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update request status
        await connection.query(
            `UPDATE vip_requests 
             SET status = ?, admin_id = ?, admin_notes = ?, processed_at = NOW()
             WHERE id = ?`,
            [newStatus, req.admin.id, notes || null, requestId]
        );

        if (action === 'approve') {
            // Calculate expiry date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + request.duration_days);

            // Create VIP subscription
            await connection.query(
                `INSERT INTO user_vip (user_id, plan_id, expires_at, payment_reference, status)
                 VALUES (?, ?, ?, ?, 'active')`,
                [request.user_id, request.plan_id, expiresAt, `VIP-REQ-${requestId}`]
            );

            // Record payment
            await connection.query(
                `INSERT INTO payments (user_id, amount, payment_type, payment_method, payment_reference, status, metadata)
                 VALUES (?, ?, 'vip_subscription', ?, ?, 'completed', ?)`,
                [request.user_id, request.amount, request.payment_method, request.transaction_id,
                JSON.stringify({ planId: request.plan_id, planName: request.plan_name, requestId })]
            );

            // Notify user
            await connection.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES (?, '🎉 VIP Activated!', ?, 'success')`,
                [request.user_id, `Your ${request.plan_name} subscription is now active! Enjoy +${request.earning_bonus}% earning bonus.`]
            );
        } else {
            // Notify user of rejection
            await connection.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES (?, 'VIP Request Rejected', ?, 'error')`,
                [request.user_id, notes ? `Your VIP request was rejected: ${notes}` : 'Your VIP request was rejected. Please contact support for more information.']
            );
        }

        // Clean up screenshot file
        if (request.screenshot_path) {
            const filePath = path.join(__dirname, '../uploads/vip-screenshots', request.screenshot_path);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Deleted VIP screenshot:', filePath);
                }
            } catch (err) {
                console.error('Failed to delete screenshot:', err);
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: `VIP request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        });

    } catch (error) {
        await connection.rollback();
        console.error('Process VIP request error:', error);
        res.status(500).json({ error: 'Failed to process VIP request' });
    } finally {
        connection.release();
    }
});

// ============ SETTINGS MANAGEMENT ============

// Get site settings
router.get('/settings', adminAuth, async (req, res) => {
    try {
        const [settings] = await pool.query('SELECT * FROM site_settings');

        // Convert to object
        const settingsObj = {
            dailyTaskLimit: 6,
            dailyOfferLimit: 1,
            cooldownHours: 12,
            minWithdrawal: 5,
            referralCommission: 10,
            vipUnlimited: true,
            withdrawalMethods: [
                { id: 'jazzcash', name: 'JazzCash', minAmount: 1, feePercent: 0 },
                { id: 'easypaisa', name: 'Easypaisa', minAmount: 1, feePercent: 0 },
                { id: 'usdt_trc20', name: 'USDT (TRC20)', minAmount: 5, feePercent: 2 },
                { id: 'binance_pay', name: 'Binance Pay', minAmount: 2, feePercent: 0 }
            ],
            coinExchangeRate: 1000
        };

        settings.forEach(s => {
            if (s.setting_key === 'daily_task_limit') settingsObj.dailyTaskLimit = parseInt(s.setting_value);
            if (s.setting_key === 'daily_offer_limit') settingsObj.dailyOfferLimit = parseInt(s.setting_value);
            if (s.setting_key === 'cooldown_hours') settingsObj.cooldownHours = parseInt(s.setting_value);
            if (s.setting_key === 'min_withdrawal_standard') settingsObj.minWithdrawal = parseFloat(s.setting_value);
            if (s.setting_key === 'referral_commission_rate') settingsObj.referralCommission = parseFloat(s.setting_value);
            if (s.setting_key === 'vip_unlimited') settingsObj.vipUnlimited = s.setting_value === 'true';
            if (s.setting_key === 'withdrawal_methods') settingsObj.withdrawalMethods = JSON.parse(s.setting_value);
            if (s.setting_key === 'coin_exchange_rate') settingsObj.coinExchangeRate = parseFloat(s.setting_value);
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update site settings
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const { dailyTaskLimit, dailyOfferLimit, cooldownHours, minWithdrawal, referralCommission, vipUnlimited, withdrawalMethods, coinExchangeRate } = req.body;

        const settingsToUpdate = [
            ['daily_task_limit', (dailyTaskLimit ?? 6).toString()],
            ['daily_offer_limit', (dailyOfferLimit ?? 1).toString()],
            ['cooldown_hours', (cooldownHours ?? 1).toString()],
            ['min_withdrawal_standard', (minWithdrawal ?? 5).toString()],
            ['referral_commission_rate', (referralCommission ?? 10).toString()],
            ['vip_unlimited', String(vipUnlimited ?? true)],
            ['coin_exchange_rate', (coinExchangeRate ?? 1000).toString()],
        ];

        if (withdrawalMethods) {
            settingsToUpdate.push(['withdrawal_methods', JSON.stringify(withdrawalMethods)]);
        }

        for (const [key, value] of settingsToUpdate) {
            await pool.query(
                `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = ?`,
                [key, value, value]
            );
        }

        // Also update referral commission in referrals table default
        // Safe check for referralCommission
        if (referralCommission) {
            await pool.query('UPDATE referrals SET commission_rate = ? WHERE commission_rate != ?', [referralCommission, referralCommission]);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Change admin password
router.post('/change-password', adminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE admin_users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.admin.id]
        );

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ============================================
// OFFERWALL MANAGEMENT
// ============================================

// Get all offerwall networks with stats
router.get('/offerwalls', adminAuth, async (req, res) => {
    try {
        const [networks] = await pool.query(
            `SELECT on2.*, 
                    COUNT(ot.id) as transaction_count,
                    SUM(CASE WHEN ot.status = 'credited' THEN ot.credited_amount ELSE 0 END) as user_payouts,
                    SUM(CASE WHEN ot.status = 'credited' THEN ot.admin_profit ELSE 0 END) as admin_earnings
             FROM offerwall_networks on2
             LEFT JOIN offerwall_transactions ot ON on2.id = ot.network_id
             GROUP BY on2.id
             ORDER BY on2.total_conversions DESC`
        );

        res.json(networks.map(n => ({
            id: n.id,
            name: n.name,
            displayName: n.display_name,
            description: n.description,
            logoUrl: n.logo_url,
            secretKey: n.secret_key ? '••••••••' + n.secret_key.slice(-4) : '',
            payoutPercent: parseFloat(n.payout_percent),
            hashMethod: n.hash_method,
            ipWhitelist: n.ip_whitelist,
            offerwallUrl: n.offerwall_url,
            status: n.status,
            stats: {
                totalEarnings: parseFloat(n.total_earnings) || 0,
                totalConversions: n.total_conversions || 0,
                userPayouts: parseFloat(n.user_payouts) || 0,
                adminEarnings: parseFloat(n.admin_earnings) || 0,
                transactionCount: parseInt(n.transaction_count) || 0
            },
            createdAt: n.created_at
        })));

    } catch (error) {
        console.error('Get offerwalls error:', error);
        res.status(500).json({ error: 'Failed to get offerwalls' });
    }
});

// Add new offerwall network
router.post('/offerwalls', adminAuth, async (req, res) => {
    try {
        const { name, displayName, description, logoUrl, secretKey, payoutPercent, hashMethod, ipWhitelist, offerwallUrl, status } = req.body;

        if (!name || !displayName || !secretKey) {
            return res.status(400).json({ error: 'Name, display name, and secret key are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO offerwall_networks (name, display_name, description, logo_url, secret_key, payout_percent, hash_method, ip_whitelist, offerwall_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.toLowerCase(), displayName, description || '', logoUrl || '', secretKey, payoutPercent || 70, hashMethod || 'md5', ipWhitelist || null, offerwallUrl || '', status || 'active']
        );

        res.json({ id: result.insertId, message: 'Offerwall network added successfully' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Network with this name already exists' });
        }
        console.error('Add offerwall error:', error);
        res.status(500).json({ error: 'Failed to add offerwall network' });
    }
});

// Update offerwall network
router.put('/offerwalls/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { displayName, description, logoUrl, secretKey, payoutPercent, hashMethod, ipWhitelist, offerwallUrl, status } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (displayName) { updates.push('display_name = ?'); values.push(displayName); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (logoUrl !== undefined) { updates.push('logo_url = ?'); values.push(logoUrl); }
        if (secretKey) { updates.push('secret_key = ?'); values.push(secretKey); }
        if (payoutPercent !== undefined) { updates.push('payout_percent = ?'); values.push(payoutPercent); }
        if (hashMethod) { updates.push('hash_method = ?'); values.push(hashMethod); }
        if (ipWhitelist !== undefined) { updates.push('ip_whitelist = ?'); values.push(ipWhitelist || null); }
        if (offerwallUrl !== undefined) { updates.push('offerwall_url = ?'); values.push(offerwallUrl); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.query(`UPDATE offerwall_networks SET ${updates.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'Offerwall network updated successfully' });

    } catch (error) {
        console.error('Update offerwall error:', error);
        res.status(500).json({ error: 'Failed to update offerwall network' });
    }
});

// Get offerwall transactions
router.get('/offerwall-transactions', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, network, userId } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT ot.*, u.username, u.email, on2.display_name as network_display_name
            FROM offerwall_transactions ot
            LEFT JOIN users u ON ot.user_id = u.id
            LEFT JOIN offerwall_networks on2 ON ot.network_id = on2.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND ot.status = ?';
            params.push(status);
        }
        if (network) {
            query += ' AND ot.network_name = ?';
            params.push(network);
        }
        if (userId) {
            query += ' AND ot.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY ot.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [transactions] = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM offerwall_transactions ot WHERE 1=1';
        const countParams = [];
        if (status) { countQuery += ' AND ot.status = ?'; countParams.push(status); }
        if (network) { countQuery += ' AND ot.network_name = ?'; countParams.push(network); }
        if (userId) { countQuery += ' AND ot.user_id = ?'; countParams.push(userId); }

        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            transactions: transactions.map(t => ({
                id: t.id,
                userId: t.user_id,
                username: t.username,
                email: t.email,
                network: t.network_display_name || t.network_name,
                transactionId: t.transaction_id,
                offerName: t.offer_name,
                payout: parseFloat(t.payout),
                creditedAmount: parseFloat(t.credited_amount),
                adminProfit: parseFloat(t.admin_profit),
                status: t.status,
                errorMessage: t.error_message,
                ipAddress: t.ip_address,
                createdAt: t.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Get offerwall transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Get offerwall stats
router.get('/offerwall-stats', adminAuth, async (req, res) => {
    try {
        // Overall stats
        const [overall] = await pool.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'credited' THEN payout ELSE 0 END) as total_revenue,
                SUM(CASE WHEN status = 'credited' THEN credited_amount ELSE 0 END) as total_payouts,
                SUM(CASE WHEN status = 'credited' THEN admin_profit ELSE 0 END) as total_profit,
                SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END) as credited_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_count,
                SUM(CASE WHEN status = 'invalid_signature' THEN 1 ELSE 0 END) as invalid_sig_count
            FROM offerwall_transactions
        `);

        // Stats by network
        const [byNetwork] = await pool.query(`
            SELECT network_name,
                   COUNT(*) as transactions,
                   SUM(CASE WHEN status = 'credited' THEN payout ELSE 0 END) as revenue,
                   SUM(CASE WHEN status = 'credited' THEN admin_profit ELSE 0 END) as profit
            FROM offerwall_transactions
            GROUP BY network_name
            ORDER BY revenue DESC
        `);

        // Today's stats
        const [today] = await pool.query(`
            SELECT 
                COUNT(*) as transactions,
                SUM(CASE WHEN status = 'credited' THEN credited_amount ELSE 0 END) as payouts,
                SUM(CASE WHEN status = 'credited' THEN admin_profit ELSE 0 END) as profit
            FROM offerwall_transactions
            WHERE DATE(created_at) = CURDATE()
        `);

        // Last 7 days daily stats
        const [daily] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as transactions,
                SUM(CASE WHEN status = 'credited' THEN payout ELSE 0 END) as revenue
            FROM offerwall_transactions
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            overall: {
                totalTransactions: parseInt(overall[0].total_transactions) || 0,
                totalRevenue: parseFloat(overall[0].total_revenue) || 0,
                totalPayouts: parseFloat(overall[0].total_payouts) || 0,
                totalProfit: parseFloat(overall[0].total_profit) || 0,
                creditedCount: parseInt(overall[0].credited_count) || 0,
                rejectedCount: parseInt(overall[0].rejected_count) || 0,
                duplicateCount: parseInt(overall[0].duplicate_count) || 0,
                invalidSignatureCount: parseInt(overall[0].invalid_sig_count) || 0
            },
            byNetwork: byNetwork.map(n => ({
                network: n.network_name,
                transactions: n.transactions,
                revenue: parseFloat(n.revenue) || 0,
                profit: parseFloat(n.profit) || 0
            })),
            today: {
                transactions: parseInt(today[0].transactions) || 0,
                payouts: parseFloat(today[0].payouts) || 0,
                profit: parseFloat(today[0].profit) || 0
            },
            dailyChart: daily.map(d => ({
                date: d.date,
                transactions: d.transactions,
                revenue: parseFloat(d.revenue) || 0
            }))
        });

    } catch (error) {
        console.error('Get offerwall stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;

