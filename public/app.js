// public/app.js
// Robust frontend logic for Nukki presale
// Requires TonConnect UI script loaded before this file.

document.addEventListener("DOMContentLoaded", () => {
  // ====== Elements ======
  const connectBtn = document.getElementById("connectWallet");
  const walletAddressEl = document.getElementById("walletAddress");
  const tonBalanceEl = document.getElementById("tonBalance");
  const foodBalanceEl = document.getElementById("foodBalance");
  const copyReferralBtn = document.getElementById("copyReferral");
  const referralLinkText = document.getElementById("referralLinkText");
  const openWhitepaperBtn = document.getElementById("openWhitepaper");

  // buy buttons are dynamic (class .buy-btn + data-pack)
  const buyButtonsSelector = ".buy-btn";

  // ====== State ======
  let tonConnectUI = null;
  let connectedAccount = null; // string address
  let config = { tonReceiver: null };
  let packsCache = []; // will store packs from backend

  // ====== Helpers ======
  const q = sel => document.querySelector(sel);
  const qa = sel => Array.from(document.querySelectorAll(sel));

  async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(()=>"");
      throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    return res.json();
  }

  function safeText(el, txt) { if (el) el.textContent = txt; }

  function capitalize(s){ return s? s.charAt(0).toUpperCase()+s.slice(1):s; }

  // ====== TonConnect init (robust) ======
  function createTonConnectUI(manifestUrl) {
    // Support different globals/exports
    try {
      if (typeof window.TON_CONNECT_UI !== "undefined" && window.TON_CONNECT_UI.TonConnectUI) {
        return new window.TON_CONNECT_UI.TonConnectUI({ manifestUrl });
      }
      if (typeof window.TonConnectUI !== "undefined") {
        return new window.TonConnectUI({ manifestUrl });
      }
      // fallback: sometimes exported as TonConnect or TonConnectUI in other builds
      if (typeof window.TONCONNECTUI !== "undefined" && window.TONCONNECTUI.TonConnectUI) {
        return new window.TONCONNECTUI.TonConnectUI({ manifestUrl });
      }
    } catch (err) {
      console.error("TonConnect construction error:", err);
    }
    return null;
  }

  // ====== UI update functions ======
  async function updateBalancesFor(address) {
    if (!address) {
      safeText(walletAddressEl, "Neconectat");
      safeText(tonBalanceEl, "—");
      safeText(foodBalanceEl, "—");
      return;
    }
    safeText(walletAddressEl, address);

    // TON balance (backend or on-chain)
    try {
      const b = await fetchJson(`/api/balance/${encodeURIComponent(address)}`);
      if (b && typeof b.balance !== "undefined") {
        safeText(tonBalanceEl, `${Number(b.balance).toLocaleString(undefined,{maximumFractionDigits:6})} TON`);
      } else {
        safeText(tonBalanceEl, "—");
      }
    } catch (err) {
      safeText(tonBalanceEl, "—");
    }

    // FOOD balance from DB
    try {
      const u = await fetchJson(`/api/user/${encodeURIComponent(address)}`);
      if (u && typeof u.food_balance !== "undefined") {
        safeText(foodBalanceEl, `${Number(u.food_balance)} FOOD`);
      } else {
        safeText(foodBalanceEl, "—");
      }
    } catch (err) {
      safeText(foodBalanceEl, "—");
    }
  }

  // ====== Load config & packs ======
  async function loadConfig() {
    try {
      const c = await fetchJson("/api/config");
      if (c && c.tonReceiver) config.tonReceiver = c.tonReceiver;
    } catch (err) {
      // ok if missing
      config.tonReceiver = config.tonReceiver || null;
    }
  }

  async function loadPacks() {
    try {
      const rows = await fetchJson("/api/packs");
      // normalize
      packsCache = (Array.isArray(rows) ? rows : (rows.packs || [])).map(r => ({
        id: r.id,
        name: r.name,
        price_ton: Number(r.price_ton),
        total_available: Number(r.total_available ?? r.total ?? 0),
        sold: Number(r.sold ?? 0),
        remaining: (Number(r.total_available ?? r.total ?? 0) - Number(r.sold ?? 0))
      }));
      renderPacksUI();
    } catch (err) {
      console.error("loadPacks error:", err);
    }
  }

  function renderPacksUI() {
    // Update header counters if exists
    const starterEl = q("#starterRemaining");
    const epicEl = q("#epicRemaining");
    const mythicEl = q("#mythicRemaining");
    packsCache.forEach(p => {
      if (/starter/i.test(p.name) && starterEl) starterEl.textContent = p.remaining;
      if (/epic/i.test(p.name) && epicEl) epicEl.textContent = p.remaining;
      if (/mythic/i.test(p.name) && mythicEl) mythicEl.textContent = p.remaining;
    });

    // Update buy buttons text & state
    qa(buyButtonsSelector).forEach(btn => {
      const key = btn.dataset.pack;
      const pack = packsCache.find(p => p.name.toLowerCase().includes(key));
      if (!pack) {
        btn.disabled = true;
        btn.textContent = "Unavailable";
        return;
      }
      if (pack.remaining <= 0) {
        btn.disabled = true;
        btn.textContent = "Sold out";
        btn.classList.add("disabled");
      } else {
        btn.disabled = false;
        btn.classList.remove("disabled");
        btn.textContent = `Cumpără ${capitalize(key)}`;
      }
    });
  }

  // ====== Referral processing ======
  function processIncomingReferral() {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref) {
        localStorage.setItem("nukki_referral", ref);
        if (referralLinkText) referralLinkText.textContent = url.toString();
      }
    } catch (err) { /* ignore */ }
  }

  async function copyReferral() {
    let link = referralLinkText && referralLinkText.textContent;
    if (!link || link === "—") {
      if (connectedAccount) {
        const url = new URL(window.location.href);
        url.searchParams.set("ref", connectedAccount);
        link = url.toString();
      } else {
        alert("Conectează portofelul ca să generezi linkul de referal.");
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      alert("Linkul de referal a fost copiat!");
    } catch (err) {
      prompt("Copie link:", link);
    }
  }

  // ====== Purchase flow ======
  async function handleBuy(packKey, btnEl) {
    if (!tonConnectUI || !tonConnectUI.account) {
      alert("Conectează portofelul mai întâi.");
      return;
    }

    const accountAddr = tonConnectUI.account.address || connectedAccount;
    if (!accountAddr) {
      alert("Adresă portofel invalidă.");
      return;
    }

    const pack = packsCache.find(p => p.name.toLowerCase().includes(packKey));
    if (!pack) { alert("Pachet indisponibil."); return; }
    if (pack.remaining <= 0) { alert("Pachet epuizat."); return; }

    // Check per-user limits via backend if endpoint exists
    try {
      const resp = await fetchJson(`/api/user-purchases/${encodeURIComponent(accountAddr)}?pack=${encodeURIComponent(packKey)}`);
      if (resp && typeof resp.count !== 'undefined' && typeof resp.limit !== 'undefined') {
        if (resp.count >= resp.limit) {
          alert(`Ai atins limita pentru ${capitalize(packKey)} (${resp.limit}).`);
          return;
        }
      }
    } catch (err) {
      // ignore if endpoint missing
    }

    // Ensure receiver known
    if (!config.tonReceiver) {
      try {
        const cfg = await fetchJson("/api/config");
        config.tonReceiver = cfg.tonReceiver;
      } catch (err) {
        alert("Adresa receiver nu este setată pe server. Contactează adminul.");
        return;
      }
    }

    const amountTon = pack.price_ton;
    const amountNanoton = BigInt(Math.round(amountTon * 1e9)).toString();

    if (!confirm(`Trimiți ${amountTon} TON pentru ${capitalize(packKey)}?`)) return;

    btnEl.disabled = true;
    const prevText = btnEl.textContent;
    btnEl.textContent = "Se procesează...";

    try {
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          { address: config.tonReceiver, amount: amountNanoton }
        ]
      };

      const sendResult = await tonConnectUI.sendTransaction(tx);
      // try to extract hash/id
      let txHash = null;
      try {
        if (sendResult) {
          if (sendResult.hash) txHash = sendResult.hash;
          else if (sendResult.in_message && sendResult.in_message.id) txHash = sendResult.in_message.id;
          else if (sendResult.result && sendResult.result.transactionHash) txHash = sendResult.result.transactionHash;
        }
      } catch (e){/* ignore */ }

      // Inform backend to create purchase record (backend must validate on-chain or via txHash later)
      try {
        const body = { wallet: accountAddr, packId: pack.id, tonSpent: amountTon };
        if (txHash) body.txHash = txHash;
        // if backend expects different field names, adjust accordingly
        const rec = await fetchJson("/api/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (rec && rec.success) {
          alert(`✅ Ai cumpărat ${pack.name}.`);
        } else {
          alert(`Tranzacție trimisă, dar înregistrarea a eșuat: ${rec && rec.message ? rec.message : "unknown"}`);
        }
      } catch (err) {
        console.warn("Backend record error:", err);
        alert("Tranzacția a fost trimisă; înregistrarea pe server a eșuat (va fi verificată).");
      }

      // update UI
      await loadPacks();
      await updateBalancesFor(accountAddr);
    } catch (err) {
      console.error("Transaction error:", err);
      alert("Tranzacția a eșuat sau a fost anulată.");
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = prevText;
    }
  }

  // ====== Attach listeners ======
  function attachUI() {
    // connect
    if (connectBtn) {
      connectBtn.addEventListener("click", async () => {
        try {
          await tonConnectUI.connectWallet();
          // onStatusChange will handle UI update
        } catch (err) {
          console.error("connectWallet failed:", err);
          alert("Conectarea wallet-ului a eșuat.");
        }
      });
    }

    // buy buttons
    qa(buyButtonsSelector).forEach(btn => {
      btn.addEventListener("click", () => handleBuy(btn.dataset.pack, btn));
    });

    // referral copy
    if (copyReferralBtn) copyReferralBtn.addEventListener("click", copyReferral);
    if (openWhitepaperBtn) openWhitepaperBtn.addEventListener("click", () => {
      window.open(`${window.location.origin}/whitepaper.pdf`, "_blank");
    });
  }

  // ====== Initialize TonConnect + handlers ======
  function initTonConnect(manifestUrl) {
    tonConnectUI = createTonConnectUI(manifestUrl);
    if (!tonConnectUI) {
      alert("TonConnect UI nu e disponibil. Verifică scriptul din index.html.");
      return;
    }

    // status change
    if (typeof tonConnectUI.onStatusChange === "function") {
      tonConnectUI.onStatusChange(async (wallet) => {
        if (wallet && wallet.account) {
          connectedAccount = wallet.account.address;
          // store user on backend (to create record & possibly save referral)
          try {
            const ref = localStorage.getItem("nukki_referral");
            await fetchJson("/api/user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wallet: connectedAccount, ref })
            });
          } catch (err) { /* ignore error */ }

          await updateBalancesFor(connectedAccount);
        } else {
          connectedAccount = null;
          await updateBalancesFor(null);
        }
      });
    } else {
      // some builds use events differently - attempt to read account periodically
      console.warn("TonConnect onStatusChange not available in this build.");
    }

    // attempt to restore or read account if already connected
    try {
      // many builds expose tonConnectUI.account after connection
      if (tonConnectUI.account && tonConnectUI.account.address) {
        connectedAccount = tonConnectUI.account.address;
        updateBalancesFor(connectedAccount);
      }
    } catch (err) { /* ignore */ }
  }

  // ====== Init app ======
  (async function init() {
    processIncomingReferral();
    await loadConfig();
    await loadPacks();
    attachUI();

    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    initTonConnect(manifestUrl);

    // if TonConnect already connected, onStatusChange may not fire; try small delay check
    setTimeout(async () => {
      try {
        if (tonConnectUI && tonConnectUI.account && tonConnectUI.account.address) {
          connectedAccount = tonConnectUI.account.address;
          await updateBalancesFor(connectedAccount);
        }
      } catch(e){/* ignore */}
    }, 800);
  })();

});
