
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://nukki.onrender.com/tonconnect-manifest.json"
});

let walletConnected = false;
let userWallet = null;

// === STATUS WALLET ===
const statusEl = document.getElementById("wallet-status");

// actualizează UI dacă walletul este deja conectat
tonConnectUI.onStatusChange(wallet => {
    if (wallet) {
        walletConnected = true;
        userWallet = wallet.account.address;
        statusEl.textContent = `🟢 Conectat: ${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`;
    } else {
        walletConnected = false;
        userWallet = null;
        statusEl.textContent = "🔴 Neconectat";
    }
});

// === LOGICA DE CUMPĂRARE ===
const prices = {
    starter: 2,
    epic: 15,
    mythic: 50
};

const ownedPacks = {};

document.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const packType = btn.closest(".pack").dataset.pack;
        const price = prices[packType];

        if (!walletConnected) {
            alert("Conectează mai întâi walletul tău TON!");
            return;
        }

        if (ownedPacks[packType]) {
            alert("Deja ai cumpărat acest pack!");
            return;
        }

        try {
            const tx = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: "EQB4L_gwbXq5ZkzG5nHCvJ1g6XYn5-EXAMPLETONADDRESS", // adresa TON a jocului tău (schimb-o ulterior)
                        amount: (price * 1e9).toString(), // 1 TON = 1e9 nanotons
                        payload: btoa(`Cumparare ${packType} pack`)
                    }
                ]
            };

            await tonConnectUI.sendTransaction(tx);

            ownedPacks[packType] = true;
            btn.textContent = "Deținut ✅";
            btn.classList.add("owned");
            document.getElementById("result").innerText = `Ai cumpărat ${packType} pack pentru ${price} TON!`;

        } catch (err) {
            console.error(err);
            alert("Tranzacția a fost anulată sau a eșuat.");
        }
    });
});
