document.addEventListener('DOMContentLoaded', async () => {
  // === CONFIG ===
  const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
  const receiverAddress = 'UQDgSjZPtVTOQzLTb0KuFDC0JNMMuJ8ifle3Fcm0EQ5qmtre'; // ← înlocuiește cu adresa TON reală unde se trimit fondurile

  // === INIT TonConnect ===
  const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: manifestUrl
  });

  const connectBtn = document.getElementById('connectWallet');
  const walletAddressEl = document.getElementById('walletAddress');
  const buyButtons = document.querySelectorAll('.buy-btn');

  // === HANDLE WALLET CONNECTION ===
  const updateWalletUI = () => {
    const wallet = tonConnectUI.account;
    if (wallet) {
      const addr = wallet.address.slice(0, 4) + '...' + wallet.address.slice(-4);
      walletAddressEl.textContent = addr;
      connectBtn.textContent = 'Connected';
      connectBtn.disabled = true;
    } else {
      walletAddressEl.textContent = '';
      connectBtn.textContent = 'Connect Wallet';
      connectBtn.disabled = false;
    }
  };

  tonConnectUI.onStatusChange((walletInfo) => {
  if (walletInfo) {
    document.getElementById('walletAddress').textContent =
      walletInfo.account.address.slice(0, 8) + '...';
  } else {
    document.getElementById('walletAddress').textContent = 'Disconnected';
  }
});
  updateWalletUI();

  connectBtn.addEventListener('click', async () => {
    try {
      await tonConnectUI.connectWallet();
      updateWalletUI();
    } catch (err) {
      console.error('Wallet connect failed:', err);
    }
  });

  // === PACK PRICES & LIMITS ===
  const packs = {
    starter: { priceTON: 2, limit: 3000 },
    epic: { priceTON: 15, limit: 1500 },
    mythic: { priceTON: 50, limit: 500 }
  };

  // === BUY HANDLER ===
  buyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const packType = btn.dataset.pack;
      const pack = packs[packType];

      if (!tonConnectUI.account) {
        alert('Please connect your wallet first.');
        return;
      }

      // === Confirm purchase ===
      const confirmBuy = confirm(
        `Buy ${packType.toUpperCase()} pack for ${pack.priceTON} TON?`
      );
      if (!confirmBuy) return;

      // === Create TON transaction ===
      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 300, // 5 min valid
          messages: [
            {
              address: receiverAddress,
              amount: (pack.priceTON * 1_000_000_000).toString(), // TON → nanotons
              payload: btoa(`Purchase ${packType} pack`)
            }
          ]
        };

        await tonConnectUI.sendTransaction(transaction);
        alert(`✅ Purchase completed! You bought the ${packType} pack.`);

        btn.textContent = 'Owned';
        btn.disabled = true;
        btn.style.background = 'linear-gradient(45deg,#4CAF50,#00c851)';
      } catch (err) {
        console.error('Transaction failed:', err);
        alert('❌ Transaction failed or cancelled.');
      }
    });
  });
});
