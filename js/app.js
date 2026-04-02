// ===== PRESALE V2 — CURRENT STAGE (sell-out based) =====
// Stage is determined by smart contract, this is display-only
// Values will be read from contract on-chain when deployed

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
    { num:1,  priceScaled: 500000,   tokens:18238,  label:"Stage 1",  next:"0.0060", walletCap:50 },
    { num:2,  priceScaled: 600000,   tokens:20062,  label:"Stage 2",  next:"0.0073", walletCap:50 },
    { num:3,  priceScaled: 730000,   tokens:22068,  label:"Stage 3",  next:"0.0088", walletCap:50 },
    { num:4,  priceScaled: 880000,   tokens:24274,  label:"Stage 4",  next:"0.0107", walletCap:50 },
    { num:5,  priceScaled: 1060000,  tokens:26702,  label:"Stage 5",  next:"0.0129", walletCap:50 },
    { num:6,  priceScaled: 1290000,  tokens:29372,  label:"Stage 6",  next:"0.0155", walletCap:50 },
    { num:7,  priceScaled: 1550000,  tokens:32309,  label:"Stage 7",  next:"0.0188", walletCap:50 },
    { num:8,  priceScaled: 1880000,  tokens:35540,  label:"Stage 8",  next:"0.0227", walletCap:100 },
    { num:9,  priceScaled: 2270000,  tokens:39094,  label:"Stage 9",  next:"0.0274", walletCap:100 },
    { num:10, priceScaled: 2740000,  tokens:43004,  label:"Stage 10", next:"0.0331", walletCap:150 },
    { num:11, priceScaled: 3310000,  tokens:47304,  label:"Stage 11", next:"0.0400", walletCap:200 },
    { num:12, priceScaled: 4000000,  tokens:52034,  label:"Stage 12", next:"0.0483", walletCap:250 },
    { num:13, priceScaled: 4830000,  tokens:57238,  label:"Stage 13", next:"0.0583", walletCap:350 },
    { num:14, priceScaled: 5830000,  tokens:62962,  label:"Stage 14", next:"0.0705", walletCap:450 },
    { num:15, priceScaled: 7050000,  tokens:69258,  label:"Stage 15", next:"0.0851", walletCap:600 },
    { num:16, priceScaled: 8510000,  tokens:76184,  label:"Stage 16", next:"0.1029", walletCap:800 },
    { num:17, priceScaled: 10290000, tokens:83802,  label:"Stage 17", next:"0.1242", walletCap:1050 },
    { num:18, priceScaled: 12420000, tokens:92182,  label:"Stage 18", next:"0.1501", walletCap:1350 },
    { num:19, priceScaled: 15010000, tokens:101400, label:"Stage 19", next:"0.1813", walletCap:1850 },
    { num:20, priceScaled: 18130000, tokens:111540, label:"Stage 20", next:"0.2190", walletCap:2450 },
    { num:21, priceScaled: 21900000, tokens:122694, label:"Stage 21", next:"0.2646", walletCap:3200 },
    { num:22, priceScaled: 26460000, tokens:134964, label:"Stage 22", next:"0.3196", walletCap:4300 },
    { num:23, priceScaled: 31960000, tokens:148460, label:"Stage 23", next:"0.3861", walletCap:5700 },
    { num:24, priceScaled: 38610000, tokens:163306, label:"Stage 24", next:"0.4664", walletCap:7550 },
    { num:25, priceScaled: 46640000, tokens:179637, label:"Stage 25", next:"0.5635", walletCap:10050 },
    { num:26, priceScaled: 56350000, tokens:197601, label:"Stage 26", next:"0.6807", walletCap:13350 },
    { num:27, priceScaled: 68070000, tokens:217361, label:"Stage 27", next:"0.8223", walletCap:17750 },
    { num:28, priceScaled: 82230000, tokens:239097, label:"Stage 28", next:"0.9934", walletCap:23600 },
    { num:29, priceScaled: 99340000, tokens:263006, label:"Stage 29", next:"1.2000", walletCap:31350 },
    { num:30, priceScaled: 120000000,tokens:289307, label:"Stage 30", next:"—",      walletCap:41650 },
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
  let currentStageIdx = 0; // 0-based index, default to stage 1
  const MAX_BUY_USDC = 50; // stage 1 cap, updated from contract

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
  function getStage() { return STAGES[currentStageIdx] || STAGES[0]; }
  function getFallbackStageId() {
    return currentStageIdx + 1;
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

  let onChainHardcap = 1400000; // new target: $1.4M
  let onChainMinBuy  = 1;

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
    // New presale contract not yet deployed — use fallback STAGES data
    // When new contract is deployed, update PRESALE_ADDR and this function
    try {
      const s = getStage();
      if(!s) return;
      syncBuyWidgetMeta();

      // Display static raised amount (will be live when contract deploys)
      const rEl=$('w-raised-val'),pEl=$('w-pct'),prEl=$('w-progress');
      const raised = 0; // Will read from contract when deployed
      const target = onChainHardcap;
      const pct = Math.min(raised/target*100, 100);
      if(rEl) rEl.textContent = `$${raised.toLocaleString('en-US',{maximumFractionDigits:0})} USDC`;
      if(pEl) pEl.textContent = pct.toFixed(1)+'%';
      if(prEl) prEl.style.width = Math.max(pct, 0.5)+'%';

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
    currentStageIdx = 0; // Stage 1
    const s=getStage();
    if(s) {
      const sv=$('w-stage-val'),pv=$('w-price-val'),np=$('w-next-price');
      if(sv) sv.textContent='1 of 30';
      if(pv) pv.textContent='$0.0050 USDC';
      if(np) np.textContent='Next: $0.0060';
    }
    // Ensure button is NEVER disabled on init
    if(btn) { btn.disabled = false; btn.textContent = 'CONNECT WALLET'; }
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

/* ═══ PRESALE V2 — 30 STAGES DATA + CHART + TABLE ═══ */
(function presaleV2() {
  const STAGES = [
    {n:1,t:18238,p:0.005,r:91,m:'sellout',wc:50},
    {n:2,t:20062,p:0.006,r:121,m:'sellout',wc:50},
    {n:3,t:22068,p:0.0073,r:161,m:'sellout',wc:50},
    {n:4,t:24274,p:0.0088,r:214,m:'sellout',wc:50},
    {n:5,t:26702,p:0.0107,r:284,m:'sellout',wc:50},
    {n:6,t:29372,p:0.0129,r:378,m:'sellout',wc:50},
    {n:7,t:32309,p:0.0155,r:502,m:'sellout',wc:50},
    {n:8,t:35540,p:0.0188,r:667,m:'sellout',wc:100},
    {n:9,t:39094,p:0.0227,r:887,m:'sellout',wc:100},
    {n:10,t:43004,p:0.0274,r:1178,m:'sellout',wc:150},
    {n:11,t:47304,p:0.0331,r:1565,m:'sellout',wc:200},
    {n:12,t:52034,p:0.04,r:2080,m:'sellout',wc:250},
    {n:13,t:57238,p:0.0483,r:2764,m:'sellout',wc:350},
    {n:14,t:62962,p:0.0583,r:3673,m:'sellout',wc:450},
    {n:15,t:69258,p:0.0705,r:4881,m:'sellout',wc:600},
    {n:16,t:76184,p:0.0851,r:6486,m:'sellout',wc:800},
    {n:17,t:83802,p:0.1029,r:8619,m:'sellout',wc:1050},
    {n:18,t:92182,p:0.1242,r:11453,m:'sellout',wc:1350},
    {n:19,t:101400,p:0.1501,r:15219,m:'sellout',wc:1850},
    {n:20,t:111540,p:0.1813,r:20223,m:'sellout',wc:2450},
    {n:21,t:122694,p:0.219,r:26873,m:'sellout',wc:3200},
    {n:22,t:134964,p:0.2646,r:35710,m:'sellout',wc:4300},
    {n:23,t:148460,p:0.3196,r:47452,m:'sellout',wc:5700},
    {n:24,t:163306,p:0.3861,r:63056,m:'sellout',wc:7550},
    {n:25,t:179637,p:0.4664,r:83791,m:'sellout',wc:10050},
    {n:26,t:197601,p:0.5635,r:111344,m:'timed',wc:13350},
    {n:27,t:217361,p:0.6807,r:147957,m:'timed',wc:17750},
    {n:28,t:239097,p:0.8223,r:196609,m:'timed',wc:23600},
    {n:29,t:263006,p:0.9934,r:261259,m:'timed',wc:31350},
    {n:30,t:289307,p:1.20,r:347168,m:'timed',wc:41650}
  ];

  // Populate table
  const tbody = document.getElementById('stagesTableBody');
  if (tbody) {
    let cumR = 0;
    STAGES.forEach(s => {
      cumR += s.r;
      const cls = s.m === 'timed' ? ' class="row-timed"' : '';
      const modeHtml = s.m === 'sellout'
        ? '<span class="mode-sell">Sell-out</span>'
        : '<span class="mode-time">Timed</span>';
      tbody.innerHTML += `<tr${cls}>
        <td><strong>${s.n}</strong></td>
        <td>${modeHtml}</td>
        <td>${s.t.toLocaleString()} GGRD</td>
        <td class="price-col">$${s.p < 0.01 ? s.p.toFixed(4) : s.p < 0.1 ? s.p.toFixed(4) : s.p.toFixed(4)}</td>
        <td class="raise-col">$${s.r.toLocaleString()}</td>
        <td>$${s.wc.toLocaleString()}</td>
      </tr>`;
    });
  }

  // Chart
  const canvas = document.getElementById('presaleChart');
  if (canvas && typeof Chart !== 'undefined') {
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: STAGES.map(s => s.n),
        datasets: [
          {
            label: 'Tokens',
            data: STAGES.map(s => s.t),
            backgroundColor: STAGES.map(s => s.m === 'sellout' ? '#00AA98' : '#F3C512'),
            borderRadius: 2,
            yAxisID: 'y',
            order: 2
          },
          {
            label: 'Price',
            data: STAGES.map(s => s.p),
            type: 'line',
            borderColor: '#E24B4A',
            backgroundColor: 'rgba(226,75,74,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointBackgroundColor: '#E24B4A',
            borderWidth: 2,
            yAxisID: 'y1',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { size: 10 } },
            title: { display: true, text: 'Stage', color: '#888', font: { size: 11 } }
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#888', font: { size: 10 }, callback: v => (v/1000).toFixed(0)+'K' },
            title: { display: true, text: 'Tokens', color: '#888', font: { size: 11 } }
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#E24B4A', font: { size: 10 }, callback: v => '$'+v.toFixed(2) },
            title: { display: true, text: 'Price (USDC)', color: '#E24B4A', font: { size: 11 } }
          }
        }
      }
    });
  }
})();


