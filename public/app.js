const tonConnect = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "https://nukki.onrender.com/tonconnect-manifest.json",
});

const connectButton = document.getElementById("connect-wallet");
connectButton.addEventListener("click", async () => {
  try {
    await tonConnect.connectWallet();
    alert("✅ Wallet conectat!");
  } catch (err) {
    alert("❌ Eroare la conectare");
    console.error(err);
  }
});

const prices = {
  starter: 2,
  epic: 15,
  mythic: 50,
};

const receiver = "UQDgSjZPtVTOQzLTb0KuFDC0JNMMuJ8ifle3Fcm0EQ5qmtre"; // <<< Schimbă cu adresa ta

document.querySelectorAll(".buy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const type = btn.dataset.pack;
    const amount = prices[type];

    if (!tonConnect.connected) {
      alert("Conectează-ți mai întâi walletul!");
      return;
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: receiver,
          amount: (amount * 1_000_000_000).toString(), // conversie TON → nanotons
        },
      ],
    };

    try {
      await tonConnect.sendTransaction(transaction);
      alert(`✅ Ai cumpărat un ${type} pack pentru ${amount} TON!`);
    } catch (err) {
      console.error(err);
      alert("❌ Tranzacție anulată sau eșuată.");
    }
  });
});
