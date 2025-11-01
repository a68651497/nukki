console.log("✅ app.js loaded");

// Inițializează TON Connect UI
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "https://nukki.onrender.com/tonconnect-manifest.json",
});

// Elemente UI
const connectBtn = document.getElementById("connect-wallet");
const statusText = document.getElementById("wallet-status");
const packButtons = document.querySelectorAll(".buy-pack");

// Conectare wallet
connectBtn.addEventListener("click", async () => {
  console.log("🔗 Se încearcă conectarea...");
  try {
    await tonConnectUI.connectWallet();
    statusText.textContent = "Conectat ✅";
  } catch (err) {
    console.error("Eroare la conectare:", err);
    statusText.textContent = "Eroare la conectare ❌";
  }
});

// Butoane de cumpărare
packButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const packType = btn.dataset.pack;
    alert(`Ai ales să cumperi pachetul ${packType.toUpperCase()}`);
  });
});
