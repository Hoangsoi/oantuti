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
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);

    // Auto migrations for existing databases
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT DEFAULT 1000 NOT NULL');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false NOT NULL');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bet_amount INT DEFAULT 0 NOT NULL');
    await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS fee_amount INT DEFAULT 0 NOT NULL');

    console.log('✅ Cơ sở dữ liệu Neon PostgreSQL đã được khởi tạo schema và migrations thành công.');
  } catch (error) {
    console.error('⚠️ Không thể khởi tạo cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra DATABASE_URL:', error);
    throw error;
  }
};
