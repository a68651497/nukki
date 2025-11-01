// Importă modulele necesare
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // opțional dacă vrei să ascunzi tokenul în .env

// Inițializează Express
const app = express();

// Inițializează botul Telegram
const TOKEN = '8087350136:AAHklmUlYZYhTnr2qcDehWvJ7nONeNZU4HY';
const bot = new TelegramBot(TOKEN, { polling: true });

// Linkul aplicației tale web (de pe Render)
const webAppUrl = 'https://nukki.onrender.com'; // schimbă cu al tău

// Servește fișierele statice din folderul "public"
app.use(express.static('public'));

// Când utilizatorul scrie /start în Telegram
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Salut 👋! Apasă pe butonul de mai jos ca să deschizi jocul:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Deschide jocul', web_app: { url: webAppUrl } }]
      ]
    }
  });
});

// Pornire server (Render folosește PORT automat)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server pornit pe portul ${PORT}`));
