// === public/app.js ===
// Nukki Presale - Frontend logic complet (real blockchain integration ready)

document.addEventListener("DOMContentLoaded", async () => {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  const connectBtn = document.getElementById("connectWallet");
  const walletAddressEl = document.getElementById("walletAddress");
  const tonBalanceEl = document.getElementById("tonBalance");
  const foodBalanceEl = document.getElementById("foodBalance");
  const packsGrid = document.querySelector(".packs-grid");
  const referralLinkText = document.getElementById("referralLinkText");
  const copyReferralBtn = document.getElementById("copyReferral");
  const openWhitepaperBtn = document.getElementById("openWhitepaper");

  let tonConnectUI;
  let connectedWallet = null;
  let tonReceiver = null;
  let packsCache = [];

  /* === HELPERS === */
  const shorten = (addr) =>
    addr ? addr.slice(0, 5) + "..." + addr.slice(-4) : "Neconectat";

  async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  /* === TON CONNECT === */
  function initTonConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl });
    tonConnectUI.onStatusChange((wallet) => {
      if (wallet && wallet.account) {
        connectedWallet = wallet.account.address;
        walletAddressEl.textContent = shorten(connectedWallet);
        updateBalances();
        updateReferral();
      } else {
        connectedWallet = null;
        walletAddressEl.textContent = "Neconectat";
        tonBalanceEl.textContent = "—";
        foodBalanceEl.textContent = "—";
      }
    });
  }

  /* === BALANCE === */
  async function updateBalances() {
    if (!connectedWallet) return;
    try {
      const ton = await fetchJson(`/api/balance/${connectedWallet}`);
      tonBalanceEl.textContent =
        ton && ton.balance
          ? `${Number(ton.balance).toFixed(3)} TON`
          : "0 TON";
    } catch {
      tonBalanceEl.textContent = "—";
    }

    try {
      const food = await fetchJson(`/api/user/${connectedWallet}`);
      foodBalanceEl.textContent =
        food && food.food_balance
          ? `${food.food_balance} FOOD`
          : "0 FOOD";
    } catch {
      foodBalanceEl.textContent = "—";
    }
  }

  /* === PACKS === */
  async function loadPacks() {
    try {
      const res = await fetchJson("/api/packs");
      packsCache = res.packs || res;
      renderPacks();
    } catch (e) {
      console.error("Eroare la încărcarea pachetelor:", e);
    }
  }

  function renderPacks() {
    packsCache.forEach((pack) => {
      const btn = document.querySelector(`.buy-btn[data-pack="${pack.name.toLowerCase()}"]`);
      if (!btn) return;
      btn.disabled = pack.remaining <= 0;
      btn.textContent =
        pack.remaining <= 0 ? "Epuizat" : `Cumpără (${pack.price_ton} TON)`;
    });
  }

  /* === CUMPĂRARE === */
  async function handleBuy(packKey, btn) {
    if (!tonConnectUI.account) {
      alert("Conectează portofelul mai întâi.");
      return;
    }

    const pack = packsCache.find((p) =>
      p.name.toLowerCase().includes(packKey)
    );
    if (!pack) {
      alert("Pachet indisponibil.");
      return;
    }

    try {
      const bal = await fetchJson(`/api/balance/${connectedWallet}`);
      if (Number(bal.balance) < pack.price_ton) {
        alert("Fonduri insuficiente în wallet.");
        return;
      }
    } catch {
      alert("Nu s-a putut verifica balanța.");
      return;
    }

    if (!tonReceiver) {
      const conf = await fetchJson("/api/config");
      tonReceiver = conf.tonReceiver;
      if (!tonReceiver) {
        alert("Adresa de primire TON lipsește!");
        return;
      }
    }

    if (!confirm(`Confirmi cumpărarea ${pack.name} pentru ${pack.price_ton} TON?`)) return;

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "Se procesează...";

    try {
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: tonReceiver,
            amount: (pack.price_ton * 1e9).toString(),
          },
        ],
      };

      await tonConnectUI.sendTransaction(tx);

      await fetchJson("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          buyer: connectedWallet,
        }),
      });

      alert(`✅ Ai cumpărat ${pack.name}!`);
      await loadPacks();
      await updateBalances();
    } catch (err) {
      console.error(err);
      alert("Tranzacția a fost anulată sau a eșuat.");
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  /* === REFERALI === */
  function updateReferral() {
    const base = new URL(window.location.href);
    base.searchParams.set("ref", connectedWallet);
    referralLinkText.textContent = base.toString();
  }

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referralLinkText.textContent);
      alert("Link copiat!");
    } catch {
      alert("Nu s-a putut copia linkul.");
    }
  }

  /* === WHITEPAPER === */
  function openWhitepaper() {
    window.open("/whitepaper.pdf", "_blank");
  }

  /* === EVENIMENTE === */
  connectBtn.addEventListener("click", () => tonConnectUI.connectWallet());
  copyReferralBtn.addEventListener("click", copyReferral);
  openWhitepaperBtn.addEventListener("click", openWhitepaper);
  document.querySelectorAll(".buy-btn").forEach((b) =>
    b.addEventListener("click", () => handleBuy(b.dataset.pack, b))
  );

  /* === INIT === */
  initTonConnect();
  await loadPacks();
});
