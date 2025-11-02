-- ==========================================
-- Nukki Presale Database Schema
-- ==========================================

-- 🔹 Table: users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    referred_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔹 Table: packs
CREATE TABLE IF NOT EXISTS packs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price_ton DECIMAL(10,2) NOT NULL,
    rarity_distribution JSONB NOT NULL,
    total_available INT NOT NULL,
    sold INT DEFAULT 0
);

-- 🔹 Table: purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    pack_id INT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
    tx_hash VARCHAR(255),
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔹 Table: referrals
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_wallet VARCHAR(255) NOT NULL,
    referred_wallet VARCHAR(255) NOT NULL,
    bonus_ton DECIMAL(10,2) DEFAULT 0,
    bonus_token_food INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Initial Packs
-- ==========================================

INSERT INTO packs (name, price_ton, rarity_distribution, total_available)
VALUES
('Starter Pack', 2.00, '{"common":90, "epic":10}', 3000),
('Epic Pack', 15.00, '{"legendary":40, "epic":40, "rare":20}', 1500),
('Mythic Pack', 50.00, '{"mythic":76, "legendary":24}', 500)
ON CONFLICT DO NOTHING;
