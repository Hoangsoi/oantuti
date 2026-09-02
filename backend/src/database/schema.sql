-- PostgreSQL Schema for OẲN TÙ TÌ Telegram Mini App

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    photo_url TEXT,
    rating INT DEFAULT 1000 NOT NULL,
    coins INT DEFAULT 1000 NOT NULL,
    wins INT DEFAULT 0 NOT NULL,
    losses INT DEFAULT 0 NOT NULL,
    draws INT DEFAULT 0 NOT NULL,
    total_matches INT DEFAULT 0 NOT NULL,
    current_streak INT DEFAULT 0 NOT NULL,
    best_streak INT DEFAULT 0 NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
    is_company_account BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    opponent_type VARCHAR(32) DEFAULT 'bot' NOT NULL,
    player_move VARCHAR(16) NOT NULL,
    opponent_move VARCHAR(16) NOT NULL,
    result VARCHAR(16) NOT NULL,
    rating_before INT NOT NULL,
    rating_change INT NOT NULL,
    rating_after INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    referred_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reward_date DATE NOT NULL,
    reward_type VARCHAR(64) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_daily_reward UNIQUE (user_id, reward_date, reward_type)
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(16) UNIQUE NOT NULL,
    host_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    guest_id INT REFERENCES users(id) ON DELETE CASCADE,
    host_move VARCHAR(16),
    guest_move VARCHAR(16),
    bet_amount INT DEFAULT 0 NOT NULL,
    fee_amount INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'waiting' NOT NULL,
    winner_id INT REFERENCES users(id) ON DELETE SET NULL,
    result VARCHAR(16),
    rating_change INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(32) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL,
    coins INT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    memo VARCHAR(255),
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_rating ON users (rating DESC, wins DESC);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code);
CREATE INDEX IF NOT EXISTS idx_matches_player_date ON matches (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_user_date ON daily_rewards (user_id, reward_date);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions (user_id, created_at DESC);
