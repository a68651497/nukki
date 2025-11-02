import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pg;

// 🗂️ Configurare directoare
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔗 Conectare la baza de date PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🧱 Inițializare Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔥 Test conexiune DB
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Conectat la baza de date PostgreSQL");
  } catch (err) {
    console.error("❌ Eroare la conectarea DB:", err);
  }
})();

// 📦 Endpoint pentru cumpărare pack
app.post("/api/buy", async (req, res) => {
  try {
    const { wallet, pack } = req.body;
    if (!wallet || !pack) {
      return res.status(400).json({ success: false, message: "Date incomplete." });
    }

    // Obține info despre pachet
    const packData = await pool.query("SELECT * FROM packs WHERE name = $1", [pack]);
    if (packData.rows.length === 0)
      return res.status(404).json({ success: false, message: "Pachet inexistent." });

    const selectedPack = packData.rows[0];

    // Verifică stoc disponibil
    if (selectedPack.remaining <= 0)
      return res.status(400).json({ success: false, message: "Pachet epuizat." });

    // Verifică limitele pe utilizator
    const userPurchases = await pool.query(
      "SELECT COUNT(*) FROM purchases WHERE wallet = $1 AND pack_name = $2",
      [wallet, pack]
    );

    const limit = getPackLimit(pack);
    if (parseInt(userPurchases.rows[0].count) >= limit)
      return res.status(400).json({
        success: false,
        message: `Ai atins limita pentru ${pack} pack.`,
      });

    // Înregistrează cumpărarea
    await pool.query(
      "INSERT INTO purchases (wallet, pack_name, price, created_at) VALUES ($1, $2, $3, NOW())",
      [wallet, pack, selectedPack.price]
    );

    // Actualizează stocul
    await pool.query("UPDATE packs SET remaining = remaining - 1 WHERE name = $1", [pack]);

    res.json({ success: true, message: `Ai cumpărat ${pack} pack cu succes!` });
  } catch (err) {
    console.error("Eroare la cumpărare:", err);
    res.status(500).json({ success: false, message: "Eroare server." });
  }
});

// 🧮 Funcție pentru limite per utilizator
function getPackLimit(pack) {
  switch (pack) {
    case "starter": return 4;
    case "epic": return 2;
    case "mythic": return 1;
    default: return 1;
  }
}

// 🔁 Pornire server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server pornit pe portul ${PORT}`);
});
