import { Pool, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const isSslRequired =
  config.nodeEnv === 'production' ||
  config.databaseUrl.includes('neon.tech') ||
  config.databaseUrl.includes('sslmode=require');

// Initialize PostgreSQL Pool
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false,
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    return res;
  } catch (error) {
    console.error('Database Query Error:', { text, error });
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    const possibleSchemaPaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '../../src/database/schema.sql'),
      path.join(process.cwd(), 'src/database/schema.sql'),
      path.join(process.cwd(), 'backend/src/database/schema.sql'),
    ];

    let schemaSql = '';
    for (const p of possibleSchemaPaths) {
      if (fs.existsSync(p)) {
        schemaSql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (schemaSql) {
      await pool.query(schemaSql);
    }

    // Auto migrations for existing databases
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT DEFAULT 1000 NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_company_account BOOLEAN DEFAULT FALSE NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_wager_amount NUMERIC(18, 4) DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level INT DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_vip_reward_claimed_month VARCHAR(7) DEFAULT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(64) UNIQUE');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INT REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code)');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bet_amount INT DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS fee_amount INT DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_bot_room BOOLEAN DEFAULT false NOT NULL');
    await pool.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_name VARCHAR(100) DEFAULT 'Phòng Đấu Cược'");
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password VARCHAR(20) DEFAULT NULL');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS spectator_count INT DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS usdt_address VARCHAR(100) DEFAULT NULL');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id SERIAL PRIMARY KEY,
        referrer_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        referred_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        level INT NOT NULL,
        amount INT NOT NULL,
        room_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vip_configs (
        vip_level INT PRIMARY KEY,
        min_wager NUMERIC(18, 4) NOT NULL,
        monthly_reward NUMERIC(18, 4) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Seed default 30 VIP levels if table is empty
    const checkVip = await pool.query('SELECT COUNT(*) as count FROM vip_configs');
    if (parseInt(checkVip.rows[0].count, 10) === 0) {
      for (let i = 1; i <= 30; i++) {
        const minWager = Math.floor(50000 * Math.pow(1.35, i - 1));
        const monthlyReward = Math.floor(10000 * Math.pow(1.32, i - 1));
        await pool.query(
          `INSERT INTO vip_configs (vip_level, min_wager, monthly_reward) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [i, minWager, monthlyReward]
        );
      }
    }

    // Auto purge Tuấn ( Demo ) account if present
    await pool.query(`DELETE FROM users WHERE first_name ILIKE '%Tuấn%Demo%' OR username ILIKE '%Tuấn%Demo%' OR first_name = 'Tuấn ( Demo )'`);

    console.log('✅ Cơ sở dữ liệu Neon PostgreSQL đã được khởi tạo schema và migrations thành công.');
  } catch (error) {
    console.error('⚠️ Không thể khởi tạo cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra DATABASE_URL:', error);
    throw error;
  }
};
