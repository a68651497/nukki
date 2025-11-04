// === index.js ===
// Nukki Presale - Backend complet (Node.js + Express + PostgreSQL + TON blockchain)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { Pool } from "pg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// === CONFIG DB ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// === CONFIG GENERAL ===
const TON_RECEIVER = process.env.TON_RECEIVER; // adresa TON a proiectului
const TONCENTER_API = "https://toncenter.com/api/v2/getAddressBalance";

// === ROUTE: Config ===
app.get("/api/config", (req, res) => {
  res.json({ tonReceiver: TON_RECEIVER });
});

// === ROUTE: Lista pachete ===
app.get("/api/packs", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM packs ORDER BY id ASC");
    res.json({ packs: result.rows });
  } catch (err) {
    console.error("Eroare packs:", err);
    res.status(500).json({ error: "Eroare la obținerea pachetelor" });
  }
});

// === ROUTE: Balanță TON ===
app.get("/api/balance/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const url = `${TONCENTER_API}?address=${wallet}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.ok) throw new Error("Toncenter error");
    const balanceTON = (Number(d.result) / 1e9).toFixed(4);
    res.json({ balance: balanceTON });
  } catch (err) {
    console.error("Eroare balance:", err);
    res.status(500).json({ error: "Nu s-a putut obține balanța" });
  }
});

// === ROUTE: Date utilizator (FOOD balance) ===
app.get("/api/user/:wallet", async (req, res) => {
  const { wallet } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE wallet = $1`,
      [wallet]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (wallet, food_balance, referral_count) VALUES ($1, 0, 0)`,
        [wallet]
      );
      return res.json({ wallet, food_balance: 0, referral_count: 0 });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Eroare user:", err);
    res.status(500).json({ error: "Eroare la citirea utilizatorului" });
  }
});

// === ROUTE: Cumpărare pachet ===
app.post("/api/purchase", async (req, res) => {
  const { packId, buyer } = req.body;

  if (!packId || !buyer) {
    return res.status(400).json({ error: "Date invalide" });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const packRes = await client.query(
        `SELECT * FROM packs WHERE id = $1 FOR UPDATE`,
        [packId]
      );
      const pack = packRes.rows[0];

      if (!pack) throw new Error("Pachetul nu există");
      if (pack.remaining <= 0) throw new Error("Pachet epuizat");

      // Actualizează stocul
      await client.query(
        `UPDATE packs SET remaining = remaining - 1 WHERE id = $1`,
        [packId]
      );

      // Înregistrează achiziția
      await client.query(
        `INSERT INTO purchases (wallet, pack_id, amount_ton) VALUES ($1, $2, $3)`,
        [buyer, packId, pack.price_ton]
      );

      // Referali (2% TON + 50 FOOD)
      const refResult = await client.query(
        `SELECT referred_by FROM users WHERE wallet = $1`,
        [buyer]
      );
      const ref = refResult.rows[0]?.referred_by;

      if (ref) {
        await client.query(
          `UPDATE users SET food_balance = food_balance + 50 WHERE wallet = $1`,
          [ref]
        );
        console.log(`Referal bonus: 50 FOOD acordat la ${ref}`);
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Achiziție înregistrată" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Eroare purchase:", err);
    res.status(500).json({ error: "Eroare la achiziție" });
  }
});

// === ROUTE fallback ===
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// === SERVER ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Serverul rulează pe portul ${PORT}`)
);
