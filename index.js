import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// 📁 Configurare de bază
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔌 Conexiune PostgreSQL
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("✅ Conectat la baza de date PostgreSQL"))
  .catch((err) => console.error("❌ Eroare conexiune DB:", err));

// 🌍 Route principală (frontend)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//
// 📦 API ROUTES
//

// 🧾 Obține lista de pachete
app.get("/api/packs", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM packs ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Eroare la /api/packs:", err);
    res.status(500).json({ error: "Eroare la preluarea pachetelor" });
  }
});

// 👤 Înregistrare / actualizare utilizator
app.post("/api/user", async (req, res) => {
  const { wallet, ref } = req.body;
  if (!wallet) return res.status(400).json({ error: "Lipsește wallet-ul" });

  try {
    let user = await pool.query("SELECT * FROM users WHERE wallet_address=$1", [wallet]);
    if (user.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (wallet_address, referred_by) VALUES ($1, $2)",
        [wallet, ref || null]
      );
      user = await pool.query("SELECT * FROM users WHERE wallet_address=$1", [wallet]);
    }
    res.json(user.rows[0]);
  } catch (err) {
    console.error("Eroare la /api/user:", err);
    res.status(500).json({ error: "Eroare la înregistrare utilizator" });
  }
});

// 💰 Achiziționare pachet
app.post("/api/purchase", async (req, res) => {
  const { wallet, packId, tonSpent, txHash } = req.body;
  if (!wallet || !packId || !tonSpent)
    return res.status(400).json({ error: "Date incomplete pentru achiziție" });

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE wallet_address=$1", [wallet]);
    if (userResult.rows.length === 0)
      return res.status(404).json({ error: "Utilizatorul nu există" });
    const user = userResult.rows[0];

    // Adaugă în tabela purchases
    await pool.query(
      "INSERT INTO purchases (user_id, pack_id, ton_spent, tx_hash) VALUES ($1, $2, $3, $4)",
      [user.id, packId, tonSpent, txHash || null]
    );

    res.json({ success: true, message: "Achiziție salvată cu succes!" });
  } catch (err) {
    console.error("Eroare la /api/purchase:", err);
    res.status(500).json({ error: "Eroare la procesarea achiziției" });
  }
});

// 💼 Obține balanța unui utilizator (FOOD + TON)
app.get("/api/balance/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const result = await pool.query(
      "SELECT food_balance FROM users WHERE wallet_address=$1",
      [wallet]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Utilizator inexistent" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Eroare la /api/balance:", err);
    res.status(500).json({ error: "Eroare la obținerea balanței" });
  }
});

// 🎯 Route fallback (pentru SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Pornire server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Serverul rulează pe portul ${PORT}`));
