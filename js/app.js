// ===== COUNTDOWN =====
const PRESALE_END = new Date('2026-03-31T01:15:19Z').getTime();

function updateCountdown() {
  const now = Date.now();
  const diff = PRESALE_END - now;
  if (diff <= 0) {
    document.querySelector('.countdown-box').innerHTML = '<div style="font-family:Bangers,cursive;font-size:2rem;color:var(--red);letter-spacing:3px">PRESALE ENDED</div>';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-days').textContent  = String(d).padStart(2,'0');
  document.getElementById('cd-hours').textContent = String(h).padStart(2,'0');
  document.getElementById('cd-mins').textContent  = String(m).padStart(2,'0');
  document.getElementById('cd-secs').textContent  = String(s).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ===== LIVE STAGE =====
const STAGES = [
  { end: new Date('2026-03-15T01:15:19Z'), num: 1, price: '0.0085 USDC' },
  { end: new Date('2026-03-20T01:15:19Z'), num: 2, price: '0.0100 USDC' },
  { end: new Date('2026-03-26T01:15:19Z'), num: 3, price: '0.0115 USDC' },
  { end: new Date('2026-03-31T01:15:19Z'), num: 4, price: '0.0134 USDC' },
];

function updateStage() {
  const now = new Date();
  for (const s of STAGES) {
    if (now < s.end) {
      document.getElementById('liveStageNum').textContent = s.num;
      document.getElementById('liveStagePrice').textContent = s.price;
      // update ticker
      document.querySelectorAll('.ticker span').forEach((el, i) => {
        if (i === 6 || i === 14) el.textContent = `⚡ STAGE ${s.num} — ${s.price}`;
      });
      return;
    }
  }
  document.getElementById('liveStageNum').textContent = '—';
  document.getElementById('liveStagePrice').textContent = 'ENDED';
}
updateStage();

function syncTickerOffset() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const navHeight = Math.ceil(nav.getBoundingClientRect().height || 60);
  document.documentElement.style.setProperty('--nav-offset', `${Math.max(navHeight, 60)}px`);
}

syncTickerOffset();
window.addEventListener('load', syncTickerOffset);
window.addEventListener('resize', syncTickerOffset);

// ===== SCROLL FADE =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ===== PRESALE WIDGET WEB3 v7 =====
// v6: WC 2.10.0 UMD, legacy provider detection
// v7: local QR, mobile deeplinks, network warn, chain validation, ethers.parseUnits
(function () {

  /* ─── stałe ─────────────────────────────────── */
  const PRESALE_ADDR  = "0xd8983534dd3c369d85127f6C9B85d98768139387";
  const USDC_ADDR     = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
  const BSC_CHAIN_ID  = 56;
  const BSC_RPC       = "https://bsc-dataseed1.binance.org/";
  const WC_PROJECT_ID = "ad704bd8122e267d73cb15391aa2ae95";
  const WC_REQUIRED_METHODS = ['eth_sendTransaction','personal_sign','eth_accounts','eth_requestAccounts','wallet_switchEthereumChain','wallet_addEthereumChain'];
  const WC_OPTIONAL_METHODS = ['eth_sendRawTransaction','eth_sign','eth_signTransaction','eth_signTypedData','eth_signTypedData_v3','eth_signTypedData_v4','wallet_getPermissions','wallet_requestPermissions','wallet_registerOnboarding','wallet_watchAsset','wallet_scanQRCode','wallet_sendCalls','wallet_getCapabilities','wallet_getCallsStatus','wallet_showCallsStatus'];
  const WC_REQUIRED_EVENTS = ['chainChanged','accountsChanged','connect','disconnect'];
  const WC_OPTIONAL_EVENTS = ['message'];

  const STAGES = [
    { end: new Date('2026-03-15T01:15:19Z'), priceScaled: 850000,  label: "Stage 1", next: "0.0100" },
    { end: new Date('2026-03-20T01:15:19Z'), priceScaled: 1000000, label: "Stage 2", next: "0.0115" },
    { end: new Date('2026-03-26T01:15:19Z'), priceScaled: 1150000, label: "Stage 3", next: "0.0134" },
    { end: new Date('2026-03-31T01:15:19Z'), priceScaled: 1340000, label: "Stage 4", next: "—" },
  ];
  const ERC20_ABI = [
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
  ];
  const BUY_ABI = ["function buy(uint256) external"];

  /* ─── stan ───────────────────────────────────── */
  let provider, signer, userAddr, wcInstance;
  let wcProviderSingleton = null;
  let wcProviderInitPromise = null;
  let wcUriListener = null;
  let wcConnectAttempt = 0;
  let connected = false;
  const MAX_BUY_USDC = 3000;
  const STAGE_WALLET_CAPS = {1: 500, 2: 750, 3: 1000, 4: 1500};
  let onChainStageId = 0;
  let onChainStageWalletCap = null;
  let onChainStagePriceScaled = null;

  /* ─── DOM helpers ────────────────────────────── */
  const $  = id => document.getElementById(id);
  const btn      = $('w-btn');
  const discBtn  = $('w-disconnect-btn');
  const stEl     = $('w-status');
  const addrEl   = $('w-addr');

  function setStatus(msg, cls) {
    if (stEl) { stEl.textContent = msg; stEl.className = 'w-status ' + (cls||''); }
  }
  function setStep(n) {
    ['ws-1','ws-2','ws-3'].forEach((id,i) => {
      const el=$(id); if(!el) return;
      el.classList.remove('active','done');
      if(i+1===n) el.classList.add('active');
      else if(i+1<n) el.classList.add('done');
    });
  }

  /* ─── helpers ────────────────────────────────── */
  function formatUsdc(v) {
    return Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
  }
  function getStage() { return STAGES.find(s => new Date() < s.end) || null; }
  function getFallbackStageId() {
    const s = getStage();
    if(!s) return 0;
    const idx = STAGES.indexOf(s);
    return idx >= 0 ? idx + 1 : 0;
  }
  function getEffectiveStageId() {
    return onChainStageId || getFallbackStageId();
  }
  function getCurrentPriceScaled() {
    if(Number.isFinite(onChainStagePriceScaled) && onChainStagePriceScaled > 0) return onChainStagePriceScaled;
    const stageId = getEffectiveStageId();
    if(stageId > 0 && STAGES[stageId - 1]) return STAGES[stageId - 1].priceScaled;
    const s = getStage();
    return s ? s.priceScaled : null;
  }
  function getCurrentStageWalletCap() {
    const stageId = getEffectiveStageId();
    const fallbackCap = stageId > 0 ? (STAGE_WALLET_CAPS[stageId] || MAX_BUY_USDC) : MAX_BUY_USDC;
    const stageCap = Number.isFinite(onChainStageWalletCap) && onChainStageWalletCap > 0 ? onChainStageWalletCap : fallbackCap;
    return Math.min(stageCap, MAX_BUY_USDC);
  }
  function getMaxBuyMessage() {
    const stageId = getEffectiveStageId();
    const maxBuy = getCurrentStageWalletCap();
    if(stageId > 0 && maxBuy < MAX_BUY_USDC) {
      return `Maximum for current stage: ${formatUsdc(maxBuy)} USDC`;
    }
    return `Maximum: ${formatUsdc(maxBuy)} USDC`;
  }
  function syncBuyWidgetMeta() {
    const stageId = getEffectiveStageId();
    const stageMeta = stageId > 0 ? STAGES[stageId - 1] : null;
    const sv = $('w-stage-val');
    const pv = $('w-price-val');
    const np = $('w-next-price');
    const note = $('w-min-note');
    const inp = $('w-usdc-in');
    const stageCap = getCurrentStageWalletCap();
    const priceScaled = getCurrentPriceScaled();

    if(sv && stageId > 0) sv.textContent = `Stage ${stageId}`;
    if(pv && priceScaled) pv.textContent = `$${(priceScaled/1e8).toFixed(4)} USDC`;
    if(np && stageMeta) np.textContent = stageMeta.next !== '—' ? `Next stage: $${stageMeta.next}` : 'Last stage!';
    if(inp) {
      inp.min = String(onChainMinBuy);
      inp.max = String(stageCap);
    }
    if(note) {
      if(stageId > 0 && stageCap < MAX_BUY_USDC) {
        note.innerHTML = `Min <span>${formatUsdc(onChainMinBuy)} USDC</span> · Stage ${stageId} max <span>${formatUsdc(stageCap)} USDC</span> · Global max <span>${formatUsdc(MAX_BUY_USDC)} USDC</span> · Claim: 50% immediate + 50% over 60 days`;
      } else {
        note.innerHTML = `Min <span>${formatUsdc(onChainMinBuy)} USDC</span> · Max <span>${formatUsdc(MAX_BUY_USDC)} USDC</span> per wallet · Claim: 50% immediate + 50% over 60 days`;
      }
    }
  }
  function calcGGRD(v) {
    if(!v||v<=0) return "0.00";
    const priceScaled = getCurrentPriceScaled();
    if(!priceScaled) return "0.00";
    return (v/(priceScaled/1e8)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function toPayAmount(v) { return ethers.parseUnits(String(v), 18); }
  function isNetworkWarningVisible() {
    const warn = $('w-network-warn');
    if(!warn) return false;
    return getComputedStyle(warn).display !== 'none';
  }
  function getAmountValidation(usdcVal) {
    if(!Number.isFinite(usdcVal) || usdcVal <= 0) {
      return { ok: false, message: `Minimum: ${onChainMinBuy} USDC` };
    }
    if(usdcVal < onChainMinBuy) {
      return { ok: false, message: `Minimum: ${onChainMinBuy} USDC` };
    }
    if(usdcVal > getCurrentStageWalletCap()) {
      return { ok: false, message: getMaxBuyMessage() };
    }
    return { ok: true, message: '' };
  }
  function refreshQuoteAndValidation() {
    const inp = $('w-usdc-in');
    const out = $('w-ggrd-out');
    const usdcVal = parseFloat(inp?.value || '0');
    const validation = getAmountValidation(usdcVal);
    if(out) out.textContent = validation.ok ? calcGGRD(usdcVal) : "0.00";
    if(connected && btn && btn.classList.contains('buying-mode')) {
      if(validation.ok && !isNetworkWarningVisible()) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    }
    return validation;
  }

  /* ─── on-chain state (BŁĄD 5 partial) ──────── */
  // Contract view selectors (discovered via RPC probing)
  const SEL = {
    totalRaised: '0xc5c4744c',
    totalSold:   '0x9106d7ba',
    hardcap:     '0xb071cbe6',
    softcap:     '0xf89be593',
    minBuy:      '0x7107d7a6',
    currentStageId: '0xec45127a',
    stageConfig: '0x4f72540b',
  };

  let onChainHardcap = 31250; // fallback
  let onChainSoftcap = 20000;
  let onChainMinBuy  = 50;

  function encodeUint256(value) {
    return BigInt(value).toString(16).padStart(64,'0');
  }
  function readAbiWord(hex, index) {
    if(!hex || !hex.startsWith('0x')) return null;
    const start = 2 + index * 64;
    const word = hex.slice(start, start + 64);
    if(word.length !== 64) return null;
    return BigInt('0x' + word);
  }
  function parseStageConfig(hex) {
    const allocation = readAbiWord(hex, 0);
    const priceScaled = readAbiWord(hex, 1);
    const walletCap = readAbiWord(hex, 2);
    const sold = readAbiWord(hex, 3);
    const raised = readAbiWord(hex, 4);
    if([allocation, priceScaled, walletCap, sold, raised].some(v => v === null)) return null;
    return { allocation, priceScaled, walletCap, sold, raised };
  }

  async function rpcCall(selector) {
    const r = await fetch(BSC_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:PRESALE_ADDR,data:selector},'latest']})});
    const j = await r.json();
    if(!j.result||j.result==='0x') return null;
    return j.result;
  }

  async function loadContractState() {
    try {
      // Parallel reads
      const [raisedHex, hardcapHex, softcapHex, minBuyHex, currentStageHex, totalSoldHex] = await Promise.all([
        rpcCall(SEL.totalRaised),
        rpcCall(SEL.hardcap),
        rpcCall(SEL.softcap),
        rpcCall(SEL.minBuy),
        rpcCall(SEL.currentStageId),
        rpcCall(SEL.totalSold),
      ]);

      // Parse on-chain values
      if(hardcapHex) onChainHardcap = Number(BigInt(hardcapHex))/1e18;
      if(softcapHex) onChainSoftcap = Number(BigInt(softcapHex))/1e18;
      if(minBuyHex)  onChainMinBuy  = Number(BigInt(minBuyHex))/1e18;
      onChainStageId = currentStageHex ? Number(BigInt(currentStageHex)) : 0;

      if(onChainStageId > 0) {
        const stageConfigHex = await rpcCall(SEL.stageConfig + encodeUint256(onChainStageId));
        const stageConfig = parseStageConfig(stageConfigHex);
        if(stageConfig) {
          onChainStageWalletCap = Number(stageConfig.walletCap)/1e18;
          onChainStagePriceScaled = Number(stageConfig.priceScaled);
        }
      } else {
        onChainStageWalletCap = null;
        onChainStagePriceScaled = null;
      }
      syncBuyWidgetMeta();

      // Update raised display
      if(raisedHex) {
        const usdc = Number(BigInt(raisedHex))/1e18;
        const pct  = Math.min(usdc/onChainHardcap*100,100);
        const rEl=$('w-raised-val'),pEl=$('w-pct'),prEl=$('w-progress');
        if(rEl)  rEl.textContent =`$${usdc.toLocaleString('en-US',{maximumFractionDigits:0})} USDC`;
        if(pEl)  pEl.textContent = pct.toFixed(1)+'%';
        if(prEl) prEl.style.width= Math.max(pct,0.5)+'%';
      }

      if(currentStageHex && onChainStageId === 0 && btn && !connected) {
        // production: silent;
      }

      // Log on-chain state
      const sold = totalSoldHex ? Number(BigInt(totalSoldHex))/1e18 : 0;
      // production: silent;
      refreshQuoteAndValidation();

    } catch(e) { /* silent */ }
  }

  /* ─── modal ──────────────────────────────────── */
  const overlay = $('wm-overlay');
  function invalidateWCFlow() { wcConnectAttempt += 1; }
  function openModal()  {
    showWalletList();
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
    if(!connected) setStatus('Select wallet');
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow='';
    showWalletList();
    if(!connected) {
      invalidateWCFlow();
      setStatus('Click button to select wallet');
    }
  }

  function showWalletList() {
    const wl=$('wm-wallet-list'), qa=$('wm-qr-area');
    if(wl) wl.style.display='flex';
    if(qa) qa.classList.remove('show');
    const t=document.querySelector('.wm-title');
    if(t) t.textContent='CONNECT WALLET';
  }
  function showQRView(uri) {
    const wl=$('wm-wallet-list'), qa=$('wm-qr-area');
    if(wl) wl.style.display='none';
    if(qa) qa.classList.add('show');
    const t=document.querySelector('.wm-title');
    if(t) t.textContent='SCAN QR CODE';
    if(uri) {
      renderQR(uri);
    } else {
      const wrap = $('wm-qr-img-wrap');
      const copyBtn = $('wm-copy-uri');
      if(wrap) wrap.innerHTML = '<div style="color:#444;font-size:0.75rem">⏳ Waiting for WalletConnect URI…</div>';
      if(copyBtn) copyBtn.style.display = 'none';
    }
  }

  $('wm-close')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if(e.target===overlay) closeModal(); });
  $('wm-qr-back')?.addEventListener('click', async () => {
    invalidateWCFlow();
    showWalletList();
    // anuluj WC jeśli w toku
    if(wcInstance) { try{await wcInstance.disconnect();}catch(_){} }
    await clearWCSessions();
    setStatus('Click button to select wallet');
  });

  /* ─── mobile detection ─────────────────────────── */
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let qrLibPromise = null;
  let wcLibPromise = null;

  function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find(s => s.src === url);
      if(existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Script load failed: ' + url));
      document.head.appendChild(s);
    });
  }

  async function ensureQRCodeLib() {
    const qrApi = window.qrcode;
    if(typeof qrApi === 'function') return;
    qrLibPromise ??= (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
      ];
      let lastErr = null;
      for(const url of urls) {
        try {
          await loadExternalScript(url);
          if(typeof window.qrcode === 'function') return;
        } catch(e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('QR generator unavailable');
    })();
    await qrLibPromise;
  }

  async function ensureWalletConnectLib() {
    const hasCtor = () => {
      const pkg = window["@walletconnect/ethereum-provider"];
      const ctor = pkg?.EthereumProvider || pkg?.default || pkg;
      return !!(ctor && typeof ctor.init === 'function');
    };

    if(hasCtor()) return;

    wcLibPromise ??= (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.23.8/dist/index.umd.js',
        'https://unpkg.com/@walletconnect/ethereum-provider@2.23.8/dist/index.umd.js',
      ];
      let lastErr = null;
      for(const url of urls) {
        try {
          await loadExternalScript(url);
          if(hasCtor()) return;
        } catch(e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('WalletConnect library unavailable');
    })();

    await wcLibPromise;
  }

  function removeProviderListener(providerObj, eventName, handler) {
    if(!providerObj || !handler) return;
    try {
      if(typeof providerObj.off === 'function') providerObj.off(eventName, handler);
      else if(typeof providerObj.removeListener === 'function') providerObj.removeListener(eventName, handler);
    } catch(_) {}
  }

  /* ─── QR renderer ─────────────────────────────── */
  function renderQR(uri) {
    const wrap = $('wm-qr-img-wrap');
    if(!wrap || !uri) return;
    wrap.innerHTML = '';

    const qrHost = document.createElement('div');
    qrHost.style.cssText = 'width:100%;display:flex;justify-content:center;align-items:center;margin-bottom:10px';
    wrap.appendChild(qrHost);

    // Render QR on both desktop and mobile; mobile also gets deep links below.
    const qrApi = window.qrcode;
    if(typeof qrApi === 'function') {
      try {
        const qr = qrApi(0, 'M');
        qr.addData(uri);
        qr.make();
        const img = document.createElement('img');
        img.alt = 'WalletConnect QR';
        img.src = qr.createDataURL(4, 2);
        img.style.cssText = 'width:220px;height:220px;border:2px solid #00AA98;display:block;margin:0 auto';
        qrHost.appendChild(img);
      } catch(_) {
        fallbackQR(qrHost, uri);
      }
    } else {
      // Try to lazy-load QR library, then render again.
      ensureQRCodeLib().then(() => renderQR(uri)).catch(() => fallbackQR(qrHost, uri));
    }

    if(isMobile) {
      const wcUri = encodeURIComponent(uri);
      const links = [
        {name:'Trust Wallet', url:`https://link.trustwallet.com/wc?uri=${wcUri}`, color:'#3375BB'},
        {name:'MetaMask', url:`https://metamask.app.link/wc?uri=${wcUri}`, color:'#F6851B'},
        {name:'Binance', url:`bnc://wc?uri=${wcUri}`, color:'#F0B90B'},
      ];
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;padding:0 1rem';
      links.forEach(l => {
        const a = document.createElement('a');
        a.href = l.url;
        a.textContent = `Open ${l.name}`;
        a.style.cssText = `display:block;padding:12px;text-align:center;border-radius:8px;font-weight:700;font-size:0.8rem;color:#fff;background:${l.color};text-decoration:none`;
        container.appendChild(a);
      });
      // Also add generic WC deep link
      const wcLink = document.createElement('a');
      wcLink.href = `wc://wc?uri=${encodeURIComponent(uri)}`;
      wcLink.textContent = 'Open any WC wallet';
      wcLink.style.cssText = 'display:block;padding:10px;text-align:center;border:1px solid #444;border-radius:8px;font-size:0.7rem;color:#aaa;margin-top:4px;text-decoration:none';
      container.appendChild(wcLink);
      wrap.appendChild(container);
    }

    // Copy URI button
    const copyBtn = $('wm-copy-uri');
    if(copyBtn) {
      copyBtn.style.display='block';
      copyBtn.onclick=()=>{
        navigator.clipboard.writeText(uri).then(()=>{
          copyBtn.textContent='✓ Copied!';
          setTimeout(()=>{copyBtn.textContent='📋 Copy URI';},2000);
        });
      };
    }
  }

  function fallbackQR(wrap, uri) {
    // External API as last resort
    const img = document.createElement('img');
    img.style.cssText = 'width:220px;height:220px;border:2px solid #00AA98;display:block;margin:0 auto';
    img.alt = 'WalletConnect QR';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}&bgcolor=0D0C0B&color=00AA98&margin=2`;
    img.onerror = () => { wrap.innerHTML = `<div style="color:#888;font-size:0.65rem;word-break:break-all;padding:1rem;border:1px solid #333;max-width:220px">${uri}</div>`; };
    wrap.appendChild(img);
  }

  /* ─── BSC switch ─────────────────────────────── */
  let currentEthProvider = null; // track active provider for chain switch

  function normalizeChainId(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      if (value.startsWith('0x')) return parseInt(value, 16);
      if (value.startsWith('eip155:')) return parseInt(value.split(':')[1], 10);
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  async function ensureBSC(eth) {
    const chRaw = await eth.request({method:'eth_chainId'});
    const chNum = normalizeChainId(chRaw);
    if(chNum===BSC_CHAIN_ID) { updateNetworkState(true); return; }
    setStatus("Switching to BSC…",'warn');
    try {
      await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]});
      updateNetworkState(true);
    } catch(e) {
      if(e.code===4902) {
        await eth.request({method:'wallet_addEthereumChain',params:[{
          chainId:'0x38',chainName:'BNB Smart Chain',
          nativeCurrency:{name:'BNB',symbol:'BNB',decimals:18},
          rpcUrls:['https://bsc-dataseed1.binance.org/'],
          blockExplorerUrls:['https://bscscan.com/']
        }]});
        updateNetworkState(true);
      } else {
        updateNetworkState(false);
        throw e;
      }
    }
  }

  /* ─── centralized network state (BŁĄD 4) ──────── */
  function updateNetworkState(isCorrectChain) {
    const warn = $('w-network-warn');
    if(!warn) return;
    if(isCorrectChain) {
      warn.style.display = 'none';
      if(btn && connected) {
        const validation = refreshQuoteAndValidation();
        if(validation.ok) {
          btn.disabled = false;
        } else {
          btn.disabled = true;
          setStatus(validation.message,'err');
        }
      }
    } else {
      warn.style.display = 'block';
      if(btn && connected) { btn.disabled = true; setStatus('⚠ Switch to BSC to continue','err'); }
    }
  }

  // Switch button handler
  $('w-switch-bsc-btn')?.addEventListener('click', async () => {
    const eth = currentEthProvider || (wcInstance) || window.ethereum;
    if(!eth) { setStatus('No wallet connected','err'); return; }
    try {
      await ensureBSC(eth);
      setStatus('Ready! Enter USDC amount and click BUY','ok');
    } catch(e) {
      setStatus('Failed to switch network — do it manually in your wallet','err');
    }
  });

  /* ─── EIP-6963: wykryj dostępne portfele ──────── */
  const eip6963Providers = {};
  window.addEventListener('eip6963:announceProvider', e => {
    const {info, provider: p} = e.detail;
    eip6963Providers[info.rdns] = {info, provider: p};
    updateWalletButtons();
  });
  function requestEIP6963() {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  const KNOWN_WALLET_RDNS = new Set(['io.metamask','com.trustwallet.app','com.binance.wallet']);

  function isKnownInjectedProvider(provider) {
    return !!(provider?.isMetaMask || provider?.isTrust || provider?.isBinance);
  }

  function getOtherInjectedProvider() {
    for (const [rdns, entry] of Object.entries(eip6963Providers)) {
      if(KNOWN_WALLET_RDNS.has(rdns)) continue;
      const candidate = entry?.provider;
      if(candidate && typeof candidate.request === 'function') return candidate;
    }

    if(Array.isArray(window.ethereum?.providers)) {
      const other = window.ethereum.providers.find(p => p && typeof p.request === 'function' && !isKnownInjectedProvider(p));
      if(other) return other;
    }

    if(window.ethereum && typeof window.ethereum.request === 'function' && !isKnownInjectedProvider(window.ethereum)) {
      return window.ethereum;
    }

    return null;
  }

  /* ─── legacy provider detection (fallback gdy brak EIP-6963) ── */
  function getLegacyProvider(walletType) {
    switch(walletType) {
      case 'metamask':
        // MetaMask ustawia isMetaMask=true na window.ethereum
        if(window.ethereum?.isMetaMask && !window.ethereum?.isTrust && !window.ethereum?.isBinance) return window.ethereum;
        // MetaMask może być w providers[] gdy jest wiele rozszerzeń
        if(window.ethereum?.providers) {
          const mm = window.ethereum.providers.find(p => p.isMetaMask && !p.isTrust && !p.isBinance);
          if(mm) return mm;
        }
        return null;
      case 'trust':
        // Trust Wallet: dedykowany global
        if(window.trustwallet?.provider) return window.trustwallet.provider;
        if(window.trustwallet) return window.trustwallet;
        // Trust Wallet ustawia isTrust=true
        if(window.ethereum?.isTrust) return window.ethereum;
        if(window.ethereum?.providers) {
          const tw = window.ethereum.providers.find(p => p.isTrust);
          if(tw) return tw;
        }
        return null;
      case 'binance':
        // Binance Web3 Wallet: dedykowany global
        if(window.BinanceChain) return window.BinanceChain;
        if(window.ethereum?.isBinance) return window.ethereum;
        if(window.ethereum?.providers) {
          const bw = window.ethereum.providers.find(p => p.isBinance);
          if(bw) return bw;
        }
        return null;
      case 'injected':
        return getOtherInjectedProvider();
      default:
        return null;
    }
  }

  function isWalletAvailable(walletType) {
    const rdnsMap = {metamask:'io.metamask',trust:'com.trustwallet.app',binance:'com.binance.wallet'};
    const rdns = rdnsMap[walletType];
    if(rdns && rdns in eip6963Providers) return true;
    return !!getLegacyProvider(walletType);
  }

  function updateWalletButtons() {
    document.querySelectorAll('.wm-wallet-btn[data-rdns]').forEach(btn => {
      const wt = btn.dataset.wallet;
      const available = isWalletAvailable(wt);
      const badge = btn.querySelector('.wm-wallet-badge-status');
      if(badge) { badge.textContent = available ? '● DETECTED' : ''; badge.style.color = available ? 'var(--green)' : ''; }
    });
  }

  /* ─── połącz injected (EIP-6963 → legacy → fallback) ──────── */
  async function connectInjected(walletType) {
    const rdnsMap = {metamask:'io.metamask',trust:'com.trustwallet.app',binance:'com.binance.wallet',injected:null};
    const rdns = rdnsMap[walletType];
    let eth = null;

    // 1. EIP-6963 (najlepsza metoda — dokładnie ten portfel)
    if(rdns && eip6963Providers[rdns]) {
      eth = eip6963Providers[rdns].provider;
      // production: silent;
    }
    // 2. Legacy globals (Trust→window.trustwallet, Binance→window.BinanceChain)
    if(!eth) {
      eth = getLegacyProvider(walletType);
      // production: silent;
    }
    // 3. For "Other" never force window.ethereum fallback (can hijack MetaMask/Trust/Binance)
    if(walletType==='injected' && !eth) {
      setStatus('⚠ No OTHER injected wallet detected — use specific wallet button or WalletConnect','err');
      return;
    }

    if(!eth || typeof eth.request !== 'function') {
      const urls={metamask:'https://metamask.io/download/',trust:'https://trustwallet.com/download',binance:'https://www.bnbchain.org/en/binance-wallet'};
      setStatus(`⚠ ${walletType} not found — install it or use WalletConnect`,'err');
      if(urls[walletType]) window.open(urls[walletType],'_blank');
      return;
    }
    try {
      setStatus("Waiting for wallet confirmation…",'warn');
      const accounts = await eth.request({method:'eth_requestAccounts'});
      if(!accounts?.length) throw new Error("No accounts returned");
      userAddr = accounts[0];
      currentEthProvider = eth;
      await ensureBSC(eth);
      provider = new ethers.BrowserProvider(eth);
      signer   = await provider.getSigner();
      onConnected();
      eth.on?.('accountsChanged', accs => { if(!accs.length) disconnectWallet(); else if(accs[0]!==userAddr) location.reload(); });
      eth.on?.('chainChanged', ()=>location.reload());
    } catch(e) {
      setStatus((e.message||'Cancelled').slice(0,70),'err');
    }
  }

  /* ─── WalletConnect ──────────────────────────── */
  async function clearWCSessions() {
    const isWCKey = k => k.startsWith('wc@') || k.startsWith('W3M') || k.startsWith('walletconnect') || k.startsWith('wc2@');

    try {
      Object.keys(localStorage).forEach(k => { if(isWCKey(k)) localStorage.removeItem(k); });
    } catch(_) {}

    try {
      Object.keys(sessionStorage).forEach(k => { if(isWCKey(k)) sessionStorage.removeItem(k); });
    } catch(_) {}

    try {
      if(!window.indexedDB || typeof window.indexedDB.databases !== 'function') return;
      const dbs = await window.indexedDB.databases();
      await Promise.all((dbs || []).map(db => new Promise(resolve => {
        const n = db?.name ? String(db.name) : '';
        if(!n) return resolve();
        const low = n.toLowerCase();
        if(!(low.includes('walletconnect') || low.startsWith('wc') || low.includes('w3m'))) return resolve();
        try {
          const req = window.indexedDB.deleteDatabase(n);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        } catch(_) {
          resolve();
        }
      })));
    } catch(_) {}
  }

  async function getWalletConnectProvider() {
    if(wcProviderSingleton) return wcProviderSingleton;
    if(wcProviderInitPromise) return wcProviderInitPromise;

    wcProviderInitPromise = (async () => {
      const WCPkg  = window["@walletconnect/ethereum-provider"];
      const WCCtor = WCPkg?.EthereumProvider || WCPkg?.default || WCPkg;
      if(!WCCtor || typeof WCCtor.init !== 'function') {
        throw new Error('WalletConnect provider constructor unavailable');
      }
      const wc = await WCCtor.init({
        projectId:       WC_PROJECT_ID,
        chains:          [BSC_CHAIN_ID],
        methods:         WC_REQUIRED_METHODS,
        optionalMethods: WC_OPTIONAL_METHODS,
        events:          WC_REQUIRED_EVENTS,
        optionalEvents:  WC_OPTIONAL_EVENTS,
        rpcMap:          {[BSC_CHAIN_ID]: BSC_RPC},
        showQrModal:     false,
        metadata: {
          name:'Giggle Reloaded Presale', description:'GGRD Presale — BSC',
          url:'https://ggrd.me', icons:['https://ggrd.me/img/ggrd-logo-512.png']
        }
      });
      wcProviderSingleton = wc;
      // production: silent;
      return wc;
    })().catch(err => {
      wcProviderInitPromise = null;
      throw err;
    });

    return wcProviderInitPromise;
  }

  function handleWCDisconnect() {
    if(connected) disconnectWallet();
  }
  function handleWCAccountsChanged() { location.reload(); }
  function handleWCChainChanged()    { location.reload(); }

  async function connectWC() {
    const connectAttempt = ++wcConnectAttempt;
    const isCurrentAttempt = () => connectAttempt === wcConnectAttempt;

    setStatus("Initializing WalletConnect…",'warn');
    showQRView();

    try {
      await ensureWalletConnectLib();
      // QR library is optional for mobile deep links, but preload for desktop QR reliability.
      await ensureQRCodeLib().catch(() => {});
      if(!isCurrentAttempt()) return;

      const wc = await getWalletConnectProvider();
      if(!isCurrentAttempt()) return;
      wcInstance = wc;

      removeProviderListener(wc, 'display_uri', wcUriListener);
      removeProviderListener(wc, 'uri', wcUriListener);
      let lastWcUri = '';
      wcUriListener = (uri) => {
        if(!isCurrentAttempt()) return;
        if(!uri || uri===lastWcUri) return;
        lastWcUri = uri;
        // production: silent;
        showQRView(uri);
      };
      wc.on?.('display_uri', wcUriListener);
      wc.on?.('uri', wcUriListener);
      removeProviderListener(wc, 'disconnect', handleWCDisconnect);
      wc.on?.('disconnect', handleWCDisconnect);

      // Czyść stare sesje i proposal cache przed nowym parowaniem.
      await clearWCSessions();
      if(!isCurrentAttempt()) return;

      setStatus("Scan QR code with your mobile wallet…",'warn');
      showQRView();

      // Timeout: if no QR URI arrives within 20s, show error
      const qrTimeout = setTimeout(() => {
        if(!isCurrentAttempt()) return;
        const wrap = $('wm-qr-img-wrap');
        if(wrap && !wrap.querySelector('img')) {
          wrap.innerHTML = '<div style="color:#F3C512;font-size:0.8rem;text-align:center;padding:1rem">⚠️ QR code generation timed out.<br><br><span style="font-size:0.7rem;color:#999">WalletConnect may be temporarily unavailable.<br>Try refreshing the page or use a browser extension wallet.</span></div>';
        }
      }, 20000);

      const accounts = await wc.enable();
      clearTimeout(qrTimeout);
      if(!isCurrentAttempt()) return;
      if(!accounts?.length) throw new Error("No accounts after WalletConnect approval");

      userAddr = accounts[0];
      currentEthProvider = wc;

      const wcChainRaw = wc.chainId ?? await wc.request({method:'eth_chainId'});
      const wcChainId = normalizeChainId(wcChainRaw);
      if(wcChainId !== BSC_CHAIN_ID) {
        // production: silent;
        try {
          await wc.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]});
          updateNetworkState(true);
        } catch(switchErr) {
          // production: silent;
          updateNetworkState(false);
        }
      } else {
        updateNetworkState(true);
      }

      provider = new ethers.BrowserProvider(wc);
      signer   = await provider.getSigner();
      if(!isCurrentAttempt()) return;

      onConnected();

      removeProviderListener(wc, 'accountsChanged', handleWCAccountsChanged);
      removeProviderListener(wc, 'chainChanged', handleWCChainChanged);
      wc.on?.('accountsChanged', handleWCAccountsChanged);
      wc.on?.('chainChanged', handleWCChainChanged);
    } catch(e) {
      if(!isCurrentAttempt()) return;

      const msg = e.message||'';
      const low = msg.toLowerCase();
      const isUserCancel = low.includes('user rejected') || low.includes('modal closed') || low.includes('user closed');
      const isProposalExpired = low.includes('proposal expired');

      if(isUserCancel) {
        setStatus('Cancelled','warn');
        showWalletList();
        return;
      }

      if(isProposalExpired) {
        await clearWCSessions();
      }

      setStatus(msg.slice(0,80)||'WalletConnect error','err');
      // production: silent;
      showQRView();
      const wrap = $('wm-qr-img-wrap');
      const detail = (msg || 'WalletConnect error').slice(0,140).replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
      if(wrap) {
        wrap.innerHTML = '<div style="color:#F3C512;font-size:0.72rem;line-height:1.45">WalletConnect error.<br>Try again or use another wallet option.<div style="color:rgba(247,250,252,0.72);font-size:0.65rem;margin-top:0.75rem;word-break:break-word">' + detail + '</div></div>';
      }
    }
  }

  /* ─── po połączeniu ──────────────────────────── */
  function onConnected() {
    connected = true;
    closeModal();
    const short = userAddr.slice(0,6)+'…'+userAddr.slice(-4);
    if(addrEl)  { addrEl.textContent=`✓ ${short}`; addrEl.classList.add('show'); }
    if(btn)     { btn.textContent='🚀 BUY $GGRD NOW'; btn.className='w-connect-btn buying-mode'; btn.disabled=false; }
    if(discBtn) discBtn.classList.add('show');
    const validation = refreshQuoteAndValidation();
    if(validation.ok) setStatus("Ready! Enter USDC amount and click BUY",'ok');
    else setStatus(validation.message,'err');
    setStep(2);
  }

  /* ─── rozłącz ────────────────────────────────── */
  async function disconnectWallet() {
    invalidateWCFlow();
    connected=false; userAddr=null; provider=null; signer=null;
    if(wcInstance) { try{await wcInstance.disconnect();}catch(_){} }
    await clearWCSessions();
    if(addrEl)  { addrEl.textContent=''; addrEl.classList.remove('show'); }
    if(discBtn) discBtn.classList.remove('show');
    if(btn)     { btn.textContent='CONNECT WALLET'; btn.className='w-connect-btn'; btn.disabled=false; }
    setStep(1);
    setStatus('Wallet disconnected. Click to reconnect.');
  }

  /* ─── dispatcher ─────────────────────────────── */
  document.querySelectorAll('.wm-wallet-btn').forEach(b => {
    b.addEventListener('click', () => {
      const type = b.dataset.wallet;
      if(type==='walletconnect') {
        showQRView();
        connectWC();
      } else { closeModal(); connectInjected(type); }
    });
  });

  /* ─── approve + buy ──────────────────────────── */
  async function approveThenBuy() {
    const usdcVal = parseFloat($('w-usdc-in')?.value||'0');
    const validation = getAmountValidation(usdcVal);
    if(!validation.ok)               { setStatus(validation.message,'err'); return; }
    if(!signer)                      { setStatus("Wallet disconnected",'err');   return; }

    // Chain check before TX (BŁĄD 7)
    try {
      const net = await provider.getNetwork();
      if(Number(net.chainId) !== BSC_CHAIN_ID) {
        updateNetworkState(false);
        setStatus("⚠ Wrong network — switch to BSC first",'err');
        btn.disabled=false;
        return;
      }
    } catch(_) {}

    btn.disabled=true;
    try {
      setStatus("Checking allowance…",'warn');
      const usdc      = new ethers.Contract(USDC_ADDR,ERC20_ABI,signer);
      const payAmount = toPayAmount(usdcVal);
      const allowance = BigInt(await usdc.allowance(userAddr,PRESALE_ADDR));
      if(allowance<payAmount) {
        setStatus("Step 1/2 — Approve USDC in wallet…",'warn');
        btn.textContent="⏳ APPROVING…"; setStep(2);
        await (await usdc.approve(PRESALE_ADDR,payAmount)).wait();
        setStatus("✓ Approved!",'ok');
      }
      setStatus("Step 2/2 — Confirm purchase in wallet…",'warn');
      btn.textContent="⏳ BUYING…"; setStep(3);
      const presale = new ethers.Contract(PRESALE_ADDR,BUY_ABI,signer);
      await (await presale.buy(payAmount)).wait();
      const ggrd=calcGGRD(usdcVal);
      setStatus(`🎉 Done! ~${ggrd} GGRD headed your way!`,'ok');
      btn.textContent="✅ ZAKUPIONO!"; btn.className='w-connect-btn'; setStep(3);
      loadContractState();
      ['🎉','🚀','😂','💸','🟡'].forEach((em,i)=>{
        setTimeout(()=>{const el=document.createElement('div');el.textContent=em;el.style.cssText=`position:fixed;left:${12+i*18}vw;top:80vh;font-size:2.5rem;pointer-events:none;z-index:99999;animation:floatUp 2.5s ease forwards`;document.body.appendChild(el);setTimeout(()=>el.remove(),2600);},i*120);
      });
    } catch(e) {
      const msg=e.reason||e.data?.message||e.message||'Błąd';
      setStatus(msg.slice(0,80),'err');
      btn.textContent="🚀 BUY $GGRD NOW"; btn.className='w-connect-btn buying-mode'; btn.disabled=false;
    }
  }

  btn?.addEventListener('click', ()=>{ if(!connected) openModal(); else approveThenBuy(); });
  discBtn?.addEventListener('click', disconnectWallet);

  /* ─── init ───────────────────────────────────── */
  (function init() {
    const s=getStage();
    if(s) {
      const sv=$('w-stage-val'),pv=$('w-price-val'),np=$('w-next-price');
      if(sv) sv.textContent=s.label;
      if(pv) pv.textContent=`$${(s.priceScaled/1e8).toFixed(4)} USDC`;
      if(np) np.textContent=s.next!=='—'?`Next stage: $${s.next}`:'Last stage!';
    } else {
      if($('w-stage-val')) $('w-stage-val').textContent="ENDED";
      if($('w-price-val')) $('w-price-val').textContent="—";
      if(btn) { btn.disabled=true; btn.textContent="PRESALE ENDED"; }
    }
    const inp=$('w-usdc-in');
    if(inp) inp.addEventListener('input',()=>{
      const validation = refreshQuoteAndValidation();
      if(!validation.ok) {
        setStatus(validation.message,'err');
        setStep(1);
        return;
      }
      if(connected && !isNetworkWarningVisible()) {
        setStatus('Ready! Enter USDC amount and click BUY','ok');
        setStep(2);
      } else {
        setStatus('Click button to select wallet');
      }
    });
    loadContractState(); setInterval(loadContractState,30000);
    setStep(1); setStatus('Click button to select wallet');
    requestEIP6963();
    // Niektóre portfele injectują provider z opóźnieniem — powtórz po 500ms i 1.5s
    setTimeout(()=>{ requestEIP6963(); updateWalletButtons(); }, 500);
    setTimeout(()=>{ requestEIP6963(); updateWalletButtons(); }, 1500);
    // WC + wallet detection init
    const se=document.createElement('style');
    se.textContent='@keyframes floatUp{from{transform:translateY(0);opacity:1}to{transform:translateY(-60vh);opacity:0}}';
    document.head.appendChild(se);
  })();

})();

/* ═══ FAQ ACCORDION ═══ */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ═══ CLICK-TO-COPY CONTRACT ADDRESSES ═══ */
document.querySelectorAll('.addr-hash').forEach(el => {
  el.title = 'Click to copy address';
  el.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el.textContent.trim());
      el.classList.add('copied');
      setTimeout(() => el.classList.remove('copied'), 1500);
    } catch { /* fallback for older browsers */ }
  });
});

/* ═══ POST-PRESALE STATE HANDLER ═══ */
(function postPresaleHandler() {
  const PRESALE_END_MS = new Date('2026-03-31T01:15:19Z').getTime();
  if (Date.now() < PRESALE_END_MS) return; // presale still active

  // Ticker: replace "PRESALE LIVE NOW" with "PRESALE ENDED"
  document.querySelectorAll('.ticker span').forEach(el => {
    if (el.textContent.includes('PRESALE LIVE NOW'))
      el.textContent = '🏁 PRESALE ENDED';
    if (el.textContent.includes('STAGE'))
      el.textContent = '⏳ RESULTS PENDING';
  });

  // Hero badge
  const badge = document.querySelector('.hero-badge');
  if (badge) {
    badge.textContent = '🏁 PRESALE ENDED — RESULTS PENDING';
    badge.style.background = 'rgba(243,197,18,0.12)';
    badge.style.borderColor = 'rgba(243,197,18,0.3)';
  }

  // Buy widget header
  const wh = document.querySelector('.w-header-label');
  if (wh) wh.textContent = 'PRESALE ENDED';
  const wsub = document.querySelector('.w-header-sub');
  if (wsub) wsub.textContent = 'RESULTS PENDING · BSC MAINNET';

  // Footer text
  const fd = document.querySelector('.footer-desc');
  if (fd) fd.textContent = 'The meme token that gives back. Fixed supply. On-chain charity. Safe governance. BSC mainnet. Presale ended March 31, 2026.';

  // Refund banner — update tense
  const rh = document.querySelector('.refund-headline');
  if (rh) rh.innerHTML = '🏁 PRESALE ENDED — SOFTCAP STATUS PENDING';
  const rb = document.querySelector('.refund-body');
  if (rb) rb.innerHTML = 'The presale period has concluded. If the <strong>$20,000 USDC softcap</strong> was not reached, the escrow contract allows every buyer to call <code>refund()</code> and receive <strong>100% of their USDC back</strong>. Check the contract on BscScan for the current state.';

  // Stage cards — mark all as ended
  document.querySelectorAll('.stage-card').forEach(el => {
    el.classList.remove('active');
    el.classList.add('ended');
  });

  // Presale stages section header
  const stagesH2 = document.querySelector('#presale')?.querySelector('h2');
  if (stagesH2) stagesH2.textContent = 'PRESALE STAGES (ENDED) ⚡';

  // Buy widget — disable input and button
  const usdcInput = document.getElementById('w-usdc-in');
  if (usdcInput) { usdcInput.disabled = true; usdcInput.placeholder = 'Presale ended'; }

  // Nav CTA — update text
  document.querySelectorAll('.nav-cta, .nav-active').forEach(el => {
    if (el.textContent.includes('BUY')) {
      el.textContent = '📊 Status';
      el.href = '#buy';
    }
  });
})();

