CREATE TABLE packs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  price_ton DECIMAL,
  total_available INT,
  sold INT DEFAULT 0
);

INSERT INTO packs (name, price_ton, total_available) VALUES
('Starter Pack', 2, 3000),
('Epic Pack', 15, 1500),
('Mythic Pack', 50, 500);
