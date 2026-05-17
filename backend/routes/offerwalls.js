/**
 * Offerwall Routes
 * User-facing endpoints for viewing and accessing offerwalls
 */

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Get all active offerwalls
 * GET /offerwalls
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [networks] = await pool.query(
            `SELECT id, name, display_name, description, logo_url, payout_percent, offerwall_url, status
             FROM offerwall_networks 
             WHERE status = 'active'
             ORDER BY total_conversions DESC`
        );

        // Get user's earnings per network
        const userId = req.user.id;
        const [earnings] = await pool.query(
            `SELECT network_id, 
                    COUNT(*) as completions,
                    SUM(credited_amount) as total_earned
             FROM offerwall_transactions 
             WHERE user_id = ? AND status = 'credited'
             GROUP BY network_id`,
            [userId]
        );

        const earningsMap = {};
        earnings.forEach(e => {
            earningsMap[e.network_id] = {
                completions: e.completions,
                totalEarned: parseFloat(e.total_earned) || 0
            };
        });

        const networksWithEarnings = networks.map(network => ({
            id: network.id,
            name: network.name,
            displayName: network.display_name,
            description: network.description,
            logoUrl: network.logo_url,
            payoutPercent: parseFloat(network.payout_percent),
            status: network.status,
            userStats: earningsMap[network.id] || { completions: 0, totalEarned: 0 }
        }));

        res.json(networksWithEarnings);

    } catch (error) {
        console.error('Get offerwalls error:', error);
        res.status(500).json({ error: 'Failed to get offerwalls' });
    }
});

/**
 * Generate offerwall URL for user
 * GET /offerwalls/:network/url
 */
router.get('/:network/url', authMiddleware, async (req, res) => {
    try {
        const { network } = req.params;
        const userId = req.user.id;

        const [networks] = await pool.query(
            'SELECT * FROM offerwall_networks WHERE name = ? AND status = "active"',
            [network.toLowerCase()]
        );

        if (networks.length === 0) {
            return res.status(404).json({ error: 'Offerwall not found or inactive' });
        }

        const networkData = networks[0];

        // Replace basic user placeholders
        let url = networkData.offerwall_url;
        url = url.replace('{user_id}', userId);
        url = url.replace('{sub_id}', userId);
        url = url.replace('{sid}', userId);
        url = url.replace('{ext_user_id}', userId);
        
        // Add username and email if available
        if (req.user) {
            url = url.replace('{user_name}', req.user.username || '');
            url = url.replace('{user_email}', req.user.email || '');
        }

        // Generate dynamic secure_hash if requested
        if (url.includes('{secure_hash}') && networkData.secret_key) {
            let hashString = '';
            
            // CPX Research uses md5(user_id + '-' + secret_key)
            if (network.toLowerCase() === 'cpx') {
                hashString = `${userId}-${networkData.secret_key}`;
                const secureHash = crypto.createHash('md5').update(hashString).digest('hex');
                url = url.replace('{secure_hash}', secureHash);
            }
        }

        res.json({
            network: networkData.display_name,
            url: url,
            openInNew: true, // Recommend opening in new tab
            instructions: `Complete offers on ${networkData.display_name} to earn rewards. You'll receive ${networkData.payout_percent}% of the offer value.`
        });

    } catch (error) {
        console.error('Get offerwall URL error:', error);
        res.status(500).json({ error: 'Failed to generate offerwall URL' });
    }
});

/**
 * Get user's offerwall earnings history
 * GET /offerwalls/my-earnings
 */
router.get('/my-earnings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Get transactions
        const [transactions] = await pool.query(
            `SELECT ot.id, ot.network_name, ot.offer_name, ot.credited_amount, ot.status, ot.created_at,
                    on2.display_name as network_display_name
             FROM offerwall_transactions ot
             LEFT JOIN offerwall_networks on2 ON ot.network_id = on2.id
             WHERE ot.user_id = ?
             ORDER BY ot.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), offset]
        );

        // Get totals
        const [totals] = await pool.query(
            `SELECT 
                COUNT(*) as total_offers,
                SUM(CASE WHEN status = 'credited' THEN credited_amount ELSE 0 END) as total_earned,
                SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END) as credited_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
             FROM offerwall_transactions 
             WHERE user_id = ?`,
            [userId]
        );

        // Get earnings by network
        const [byNetwork] = await pool.query(
            `SELECT network_name, 
                    COUNT(*) as completions,
                    SUM(credited_amount) as earned
             FROM offerwall_transactions 
             WHERE user_id = ? AND status = 'credited'
             GROUP BY network_name
             ORDER BY earned DESC`,
            [userId]
        );

        res.json({
            transactions: transactions.map(t => ({
                id: t.id,
                network: t.network_display_name || t.network_name,
                offerName: t.offer_name || 'Offer completed',
                amount: parseFloat(t.credited_amount),
                status: t.status,
                createdAt: t.created_at
            })),
            summary: {
                totalOffers: parseInt(totals[0].total_offers) || 0,
                totalEarned: parseFloat(totals[0].total_earned) || 0,
                creditedCount: parseInt(totals[0].credited_count) || 0,
                pendingCount: parseInt(totals[0].pending_count) || 0
            },
            byNetwork: byNetwork.map(n => ({
                network: n.network_name,
                completions: n.completions,
                earned: parseFloat(n.earned) || 0
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: transactions.length === parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get offerwall earnings error:', error);
        res.status(500).json({ error: 'Failed to get earnings history' });
    }
});

module.exports = router;
