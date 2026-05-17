// Run settings migration
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Create site_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ site_settings table created');

        // Create user_daily_limits table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_daily_limits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                tasks_completed INT DEFAULT 0,
                offers_completed INT DEFAULT 0,
                cooldown_until DATETIME DEFAULT NULL,
                reset_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_date (user_id, reset_date)
            )
        `);
        console.log('✅ user_daily_limits table created');

        // Insert default settings
        const defaults = [
            ['daily_task_limit', '6'],
            ['daily_offer_limit', '1'],
            ['cooldown_hours', '12'],
            ['min_withdrawal', '5'],
            ['referral_commission', '10'],
            ['vip_unlimited', 'true'],
            ['coin_exchange_rate', '1000']
        ];

        for (const [key, value] of defaults) {
            await pool.query(
                `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = setting_value`,
                [key, value]
            );
        }
        console.log('✅ Default settings inserted');

        console.log('\\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        await pool.end();
    }
}

migrate();
