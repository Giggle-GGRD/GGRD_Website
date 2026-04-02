function syncTickerOffset() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const navHeight = Math.ceil(nav.getBoundingClientRect().height || 60);
  document.documentElement.style.setProperty('--nav-offset', `${Math.max(navHeight, 60)}px`);
}

syncTickerOffset();
window.addEventListener('load', syncTickerOffset);
window.addEventListener('resize', syncTickerOffset);

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach((element) => fadeObserver.observe(element));

(function () {
  const config = window.GGRDPresaleConfig;
  const ethersLib = window.ethers;

  if (!config || !ethersLib) {
    console.error('Presale runtime dependencies are missing.');
    return;
  }

  const { ethers } = ethersLib;
  const readProvider = new ethers.JsonRpcProvider(config.chain.rpcUrls[0], config.chain.id);
  const presaleInterface = new ethers.Interface(config.presaleAbi);
  const DECIMALS_FALLBACK = 6;
  const MAX_STATUS_LENGTH = 180;

  const $ = (id) => document.getElementById(id);
  const dom = {
    overlay: $('wm-overlay'),
    walletList: $('wm-wallet-list'),
    qrArea: $('wm-qr-area'),
    qrWrap: $('wm-qr-img-wrap'),
    qrCopyButton: $('wm-copy-uri'),
    walletModalTitle: document.querySelector('.wm-title'),
    walletModalSubtitle: document.querySelector('.wm-subtitle'),
    button: $('w-btn'),
    disconnectButton: $('w-disconnect-btn'),
    status: $('w-status'),
    address: $('w-addr'),
    payInput: $('w-usdc-in'),
    receiveOutput: $('w-ggrd-out'),
    networkWarning: $('w-network-warn'),
    switchNetworkButton: $('w-switch-bsc-btn'),
    widgetBadge: $('widget-badge-text'),
    stageValue: $('w-stage-val'),
    priceValue: $('w-price-val'),
    nextPriceValue: $('w-next-price'),
    raisedValue: $('w-raised-val'),
    raisedPct: $('w-pct'),
    raisedTarget: $('w-target-val'),
    raisedProgress: $('w-progress'),
    stageProgressLabel: $('w-stage-progress-label'),
    stageProgressValue: $('w-stage-progress-value'),
    stageProgressBar: $('w-stage-progress-bar'),
    minNote: $('w-min-note'),
    widgetFooterClaim: $('widget-footer-claim'),
    widgetFooterSecure: $('widget-footer-secure'),
    heroFootnote: $('hero-widget-footnote'),
    payTokenAddressNote: $('pay-token-address-note'),
    stageIndicatorLabel: $('liveStageLabel'),
    stageIndicatorValue: $('liveStageNum'),
    stageIndicatorPrice: $('liveStagePrice'),
    heroBadge: $('hero-badge'),
    heroStatusLabel: $('hero-live-status-label'),
    heroStatusMain: $('hero-live-status-main'),
    heroStatusSecondary: $('hero-live-status-secondary'),
    heroStatusSub: $('hero-live-status-sub'),
    refundHeadline: $('refund-headline'),
    refundBody: $('refund-body'),
    refundProofLabel: $('refund-proof-label'),
    refundProofValue: $('refund-proof-value'),
    refundProofSub: $('refund-proof-sub'),
    sectionStartPrice: $('ps-start-price'),
    sectionFinalPrice: $('ps-final-price'),
    sectionStageCount: $('ps-stage-count'),
    sectionTokenCap: $('ps-token-cap'),
    sectionSoftcap: $('ps-softcap'),
    sectionHardcap: $('ps-hardcap'),
    modesWindowBadge: $('pm-window-badge'),
    modesWindowTitle: $('pm-window-title'),
    modesWindowDesc: $('pm-window-desc'),
    modesCapsBadge: $('pm-caps-badge'),
    modesCapsTitle: $('pm-caps-title'),
    modesCapsDesc: $('pm-caps-desc'),
    capSoftcap: $('cap-softcap'),
    capHardcap: $('cap-hardcap'),
    capSplit: $('cap-split'),
    capClaim: $('cap-claim'),
    stagesTableBody: $('stagesTableBody'),
    chartCanvas: $('presaleChart'),
  };

  const state = {
    browserProvider: null,
    signer: null,
    currentEthProvider: null,
    connected: false,
    account: null,
    wcInstance: null,
    wcProviderSingleton: null,
    wcProviderInitPromise: null,
    wcUriListener: null,
    wcConnectAttempt: 0,
    qrLibPromise: null,
    wcLibPromise: null,
    chart: null,
    refreshPromise: null,
    refreshTimer: null,
    presale: {
      loading: true,
      error: null,
      stages: [],
      stageCount: 0,
      currentStageId: 0,
      priceScale: 100000000n,
      saleTokenAddress: config.saleTokenAddress,
      saleTokenSymbol: 'GGRD',
      saleTokenDecimals: 18,
      payTokenAddress: config.defaultPayTokenAddress,
      payTokenSymbol: 'USDC',
      payTokenDecimals: DECIMALS_FALLBACK,
      saleUnit: 10n ** 18n,
      payUnit: 10n ** BigInt(DECIMALS_FALLBACK),
      startTs: 0,
      endTs: 0,
      presaleDuration: 0,
      claimLinearDuration: config.claimLinearDays * 24 * 60 * 60,
      softcap: 0n,
      hardcap: 0n,
      minBuy: 0n,
      globalMaxPerWallet: 0n,
      tokenCap: 0n,
      totalRaised: 0n,
      totalSold: 0n,
      finalized: false,
      succeeded: false,
      finalizedAt: 0,
    },
    wallet: {
      loading: false,
      chainId: null,
      balance: null,
      allowance: 0n,
      contributed: 0n,
      purchased: 0n,
      claimed: 0n,
      claimable: 0n,
      currentStageContributed: 0n,
    },
  };

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const eip6963Providers = {};
  const knownWalletRdns = new Set(['io.metamask', 'com.trustwallet.app', 'com.binance.wallet']);

  function clampStatus(message) {
    return String(message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_STATUS_LENGTH);
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function setTextByClass(className, value) {
    document.querySelectorAll(`.${className}`).forEach((node) => {
      node.textContent = value;
    });
  }

  function setStatus(message, tone) {
    if (!dom.status) return;
    dom.status.textContent = clampStatus(message);
    dom.status.className = `w-status${tone ? ` ${tone}` : ''}`;
  }

  function setButtonState(label, options = {}) {
    if (!dom.button) return;
    const { disabled = false, mode = '' } = options;
    dom.button.textContent = label;
    dom.button.disabled = disabled;
    dom.button.className = `w-connect-btn${mode ? ` ${mode}` : ''}`;
  }

  function setStep(step) {
    ['ws-1', 'ws-2', 'ws-3'].forEach((id, index) => {
      const node = $(id);
      if (!node) return;
      node.classList.remove('active', 'done');
      const currentStep = index + 1;
      if (step > 3) {
        node.classList.add('done');
        return;
      }
      if (currentStep < step) {
        node.classList.add('done');
      } else if (currentStep === step) {
        node.classList.add('active');
      }
    });
  }

  function normalizeChainId(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      if (value.startsWith('0x')) return parseInt(value, 16);
      if (value.startsWith('eip155:')) return parseInt(value.split(':')[1], 10);
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  }

  function isCorrectChain(chainId) {
    return normalizeChainId(chainId) === config.chain.id;
  }

  function shortAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function safeToNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatUnits(value, decimals, options = {}) {
    const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options;
    try {
      const asNumber = Number(ethers.formatUnits(value, decimals));
      if (Number.isFinite(asNumber)) {
        return asNumber.toLocaleString('en-US', {
          minimumFractionDigits,
          maximumFractionDigits,
        });
      }
      return ethers.formatUnits(value, decimals);
    } catch (_) {
      return '0';
    }
  }

  function formatPayAmount(value, options = {}) {
    return `${formatUnits(value, state.presale.payTokenDecimals, options)} ${state.presale.payTokenSymbol}`;
  }

  function formatSaleAmount(value, options = {}) {
    return `${formatUnits(value, state.presale.saleTokenDecimals, options)} ${state.presale.saleTokenSymbol}`;
  }

  function formatPriceScaled(priceScaled) {
    if (priceScaled === null || priceScaled === undefined) return '--';
    const numeric = safeToNumber(priceScaled) / safeToNumber(state.presale.priceScale || 100000000n, 100000000);
    return `$${numeric.toFixed(4)} ${state.presale.payTokenSymbol}`;
  }

  function formatPriceCompact(priceScaled) {
    if (priceScaled === null || priceScaled === undefined) return '--';
    const numeric = safeToNumber(priceScaled) / safeToNumber(state.presale.priceScale || 100000000n, 100000000);
    return `$${numeric.toFixed(4)}`;
  }

  function formatUtc(timestampSeconds) {
    if (!timestampSeconds) return 'n/a';
    const date = new Date(timestampSeconds * 1000);
    return `${new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    }).format(date)} UTC`;
  }

  function formatInputValue(value, decimals) {
    const raw = ethers.formatUnits(value, decimals);
    return raw.includes('.') ? raw.replace(/\.?0+$/, '') : raw;
  }

  function getErrorData(error) {
    if (!error) return null;
    if (typeof error === 'string' && error.startsWith('0x')) return error;
    const queue = [error];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      const candidates = [
        current.data,
        current.error?.data,
        current.info?.error?.data,
        current.receipt?.revertReason,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.startsWith('0x')) {
          return candidate;
        }
      }
      if (current.cause) queue.push(current.cause);
      if (current.error) queue.push(current.error);
    }
    return null;
  }

  function parseContractError(error, iface) {
    const data = getErrorData(error);
    if (!data) return null;
    try {
      return iface.parseError(data);
    } catch (_) {
      return null;
    }
  }

  function extractErrorName(error) {
    return parseContractError(error, presaleInterface)?.name || null;
  }

  function getStage(stageId) {
    return state.presale.stages.find((stage) => stage.id === stageId) || null;
  }

  function getFirstStage() {
    return state.presale.stages[0] || null;
  }

  function getLastStage() {
    return state.presale.stages[state.presale.stages.length - 1] || null;
  }

  function getCurrentStage() {
    return getStage(state.presale.currentStageId);
  }

  function getLifecycle() {
    const presale = state.presale;
    const now = Math.floor(Date.now() / 1000);

    if (presale.loading && presale.stageCount === 0) {
      return {
        key: 'loading',
        title: 'Loading live contract data',
        badge: 'LIVE CONTRACT STATUS - LOADING - BSC MAINNET',
        description: 'Reading presale state directly from BNB Chain.',
        proofLabel: 'Contract read',
        proofValue: 'Loading',
        proofSub: 'Waiting for RPC response.',
      };
    }

    if (presale.error) {
      return {
        key: 'unavailable',
        title: 'Live data unavailable',
        badge: 'LIVE CONTRACT STATUS - DATA UNAVAILABLE - BSC MAINNET',
        description: 'The widget could not verify the presale contract state. Purchases stay blocked until the read succeeds.',
        proofLabel: 'Contract read',
        proofValue: 'Unavailable',
        proofSub: clampStatus(presale.error),
      };
    }

    if (presale.finalized) {
      if (presale.succeeded) {
        return {
          key: 'finalized-success',
          title: 'Presale finalized',
          badge: 'LIVE CONTRACT STATUS - FINALIZED - BSC MAINNET',
          description: `The presale finalized successfully on ${formatUtc(presale.finalizedAt)}. New purchases are disabled.`,
          proofLabel: 'Finalize state',
          proofValue: 'Success',
          proofSub: `Finalized ${formatUtc(presale.finalizedAt)}`,
        };
      }
      return {
        key: 'finalized-failure',
        title: 'Presale finalized below softcap',
        badge: 'LIVE CONTRACT STATUS - REFUND PATH - BSC MAINNET',
        description: `The presale finalized below softcap on ${formatUtc(presale.finalizedAt)}. New purchases are disabled.`,
        proofLabel: 'Finalize state',
        proofValue: 'Refund',
        proofSub: `Finalized ${formatUtc(presale.finalizedAt)}`,
      };
    }

    if (presale.startTs && now < presale.startTs) {
      return {
        key: 'upcoming',
        title: 'Presale not started',
        badge: 'LIVE CONTRACT STATUS - NOT STARTED - BSC MAINNET',
        description: `The contract opens at ${formatUtc(presale.startTs)}. Purchases stay blocked until then.`,
        proofLabel: 'Contract window',
        proofValue: 'Upcoming',
        proofSub: `Starts ${formatUtc(presale.startTs)}`,
      };
    }

    if (presale.currentStageId > 0) {
      const stage = getCurrentStage();
      return {
        key: 'active',
        title: `Stage ${presale.currentStageId} is live`,
        badge: `LIVE CONTRACT STATUS - STAGE ${presale.currentStageId} OF ${presale.stageCount} - BSC MAINNET`,
        description: `Current stage price is ${formatPriceScaled(stage?.priceScaled)}. Contract window closes at ${formatUtc(presale.endTs)}.`,
        proofLabel: 'Current stage',
        proofValue: `${presale.currentStageId}/${presale.stageCount}`,
        proofSub: `${formatPriceCompact(stage?.priceScaled)} ${state.presale.payTokenSymbol} · Hardcap ${formatPayAmount(presale.hardcap)}`,
      };
    }

    if (presale.endTs && now >= presale.endTs) {
      return {
        key: 'ended',
        title: 'Presale window closed',
        badge: 'LIVE CONTRACT STATUS - PRESALE CLOSED - BSC MAINNET',
        description: `The contract stopped accepting buys at ${formatUtc(presale.endTs)}. New purchases are blocked until finalization state changes.`,
        proofLabel: 'Contract window',
        proofValue: 'Closed',
        proofSub: `Ended ${formatUtc(presale.endTs)}`,
      };
    }

    return {
      key: 'inactive',
      title: 'Presale inactive',
      badge: 'LIVE CONTRACT STATUS - INACTIVE - BSC MAINNET',
      description: 'The contract is not accepting purchases right now.',
      proofLabel: 'Contract state',
      proofValue: 'Inactive',
      proofSub: 'Buy flow blocked by contract state.',
    };
  }

  function getInactiveWalletMessage(lifecycle) {
    if (!state.account) return lifecycle.description;

    if (lifecycle.key === 'finalized-success' && state.wallet.claimable > 0n) {
      return `Presale finalized successfully. Claimable now: ${formatSaleAmount(state.wallet.claimable)}. Buy flow remains closed.`;
    }

    if (lifecycle.key === 'finalized-failure' && state.wallet.contributed > 0n) {
      return `Presale finalized below softcap. Refundable amount on-chain: ${formatPayAmount(state.wallet.contributed)}. Buy flow remains closed.`;
    }

    if (lifecycle.key === 'ended') {
      return `${lifecycle.description} Wallet connection remains available for balance, claim or refund checks.`;
    }

    return lifecycle.description;
  }

  function calculateTokenOut(payIn, stage) {
    if (!stage || payIn <= 0n) return 0n;
    return (payIn * state.presale.priceScale * state.presale.saleUnit) / (stage.priceScaled * state.presale.payUnit);
  }

  function calculateMaxPayForStageInventory(stage) {
    if (!stage) return 0n;
    const remainingTokens = stage.allocation - stage.sold;
    if (remainingTokens <= 0n) return 0n;
    return (remainingTokens * stage.priceScaled * state.presale.payUnit) / (state.presale.priceScale * state.presale.saleUnit);
  }

  function minBigInt(values) {
    const filtered = values.filter((value) => typeof value === 'bigint' && value >= 0n);
    if (filtered.length === 0) return 0n;
    return filtered.reduce((smallest, current) => (current < smallest ? current : smallest));
  }

  function getActiveConstraints() {
    const lifecycle = getLifecycle();
    if (lifecycle.key !== 'active') {
      return {
        active: false,
        lifecycle,
        stage: null,
      };
    }

    const stage = getCurrentStage();
    const hardcapRemaining = state.presale.hardcap > state.presale.totalRaised
      ? state.presale.hardcap - state.presale.totalRaised
      : 0n;
    const stageInventoryPayCap = calculateMaxPayForStageInventory(stage);
    const globalRemaining = state.account
      ? (state.presale.globalMaxPerWallet > state.wallet.contributed
          ? state.presale.globalMaxPerWallet - state.wallet.contributed
          : 0n)
      : state.presale.globalMaxPerWallet;
    const stageWalletRemaining = state.account
      ? (stage.walletCap > state.wallet.currentStageContributed
          ? stage.walletCap - state.wallet.currentStageContributed
          : 0n)
      : stage.walletCap;
    const maxPayIn = minBigInt([hardcapRemaining, stageInventoryPayCap, globalRemaining, stageWalletRemaining]);

    return {
      active: true,
      lifecycle,
      stage,
      hardcapRemaining,
      stageInventoryPayCap,
      globalRemaining,
      stageWalletRemaining,
      maxPayIn,
    };
  }

  function parseInputAmount(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) {
      return { ok: false, empty: true, message: '' };
    }
    if (!/^\d+(\.\d+)?$/.test(value)) {
      return { ok: false, message: 'Enter a valid USDC amount.' };
    }
    try {
      return {
        ok: true,
        value,
        units: ethers.parseUnits(value, state.presale.payTokenDecimals),
      };
    } catch (_) {
      return {
        ok: false,
        message: `${state.presale.payTokenSymbol} supports up to ${state.presale.payTokenDecimals} decimals.`,
      };
    }
  }

  function getValidationState() {
    const lifecycle = getLifecycle();
    const constraints = getActiveConstraints();
    const parsed = parseInputAmount(dom.payInput?.value || '');

    const result = {
      lifecycle,
      constraints,
      parsed,
      connected: !!state.account,
      chainOkay: state.account ? isCorrectChain(state.wallet.chainId) : true,
      readyForPurchase: false,
      inputOk: false,
      payIn: 0n,
      tokenOut: 0n,
      reason: lifecycle.description,
      tone: lifecycle.key === 'unavailable' ? 'err' : 'warn',
      needsApproval: false,
    };

    if (!constraints.active) {
      if (parsed.ok) {
        result.payIn = parsed.units;
      }
      return result;
    }

    if (!parsed.ok) {
      result.reason = parsed.empty
        ? `Minimum purchase is ${formatPayAmount(state.presale.minBuy)}.`
        : parsed.message;
      result.tone = parsed.empty ? 'warn' : 'err';
      return result;
    }

    const payIn = parsed.units;
    const stage = constraints.stage;
    const tokenOut = calculateTokenOut(payIn, stage);
    result.payIn = payIn;
    result.tokenOut = tokenOut;

    if (payIn < state.presale.minBuy) {
      result.reason = `Minimum purchase is ${formatPayAmount(state.presale.minBuy)}.`;
      result.tone = 'err';
      return result;
    }

    if (tokenOut <= 0n) {
      result.reason = `Amount is too small for the current ${state.presale.payTokenSymbol} price.`;
      result.tone = 'err';
      return result;
    }

    const remainingStageTokens = stage.allocation - stage.sold;
    if (tokenOut > remainingStageTokens) {
      result.reason = `Current stage allocation remaining: ${formatSaleAmount(remainingStageTokens)}.`;
      result.tone = 'err';
      return result;
    }

    if (payIn > constraints.stageWalletRemaining) {
      result.reason = `Current stage wallet cap remaining: ${formatPayAmount(constraints.stageWalletRemaining)}.`;
      result.tone = 'err';
      return result;
    }

    if (payIn > constraints.globalRemaining) {
      result.reason = `Global wallet cap remaining: ${formatPayAmount(constraints.globalRemaining)}.`;
      result.tone = 'err';
      return result;
    }

    if (payIn > constraints.hardcapRemaining) {
      result.reason = `Hardcap remaining: ${formatPayAmount(constraints.hardcapRemaining)}.`;
      result.tone = 'err';
      return result;
    }

    if (state.account && typeof state.wallet.balance === 'bigint' && payIn > state.wallet.balance) {
      result.reason = `Insufficient ${state.presale.payTokenSymbol} balance.`;
      result.tone = 'err';
      return result;
    }

    if (state.account && !result.chainOkay) {
      result.reason = 'Switch wallet to BNB Chain to continue.';
      result.tone = 'err';
      return result;
    }

    result.inputOk = true;

    if (!state.account) {
      result.reason = 'Connect wallet to approve and buy.';
      result.tone = 'warn';
      return result;
    }

    result.needsApproval = state.wallet.allowance < payIn;
    result.readyForPurchase = true;
    result.reason = result.needsApproval
      ? `Allowance is below ${formatPayAmount(payIn)}. The widget will request approval first.`
      : `Ready to submit buy for ${formatSaleAmount(tokenOut)}.`;
    result.tone = result.needsApproval ? 'warn' : 'ok';
    return result;
  }

  function renderNetworkWarning() {
    if (!dom.networkWarning) return;
    const shouldShow = state.account && !isCorrectChain(state.wallet.chainId);
    dom.networkWarning.style.display = shouldShow ? 'block' : 'none';
  }

  function renderProgressBars() {
    const lifecycle = getLifecycle();
    const totalPercent = state.presale.hardcap > 0n
      ? Math.min((safeToNumber(state.presale.totalRaised) / safeToNumber(state.presale.hardcap)) * 100, 100)
      : 0;

    if (dom.raisedProgress) {
      dom.raisedProgress.style.width = `${Math.max(totalPercent, 0)}%`;
    }

    const stage = lifecycle.key === 'active' ? getCurrentStage() : null;
    if (!stage) {
      setText(dom.stageProgressLabel, lifecycle.key === 'loading' ? 'Current stage allocation' : 'Buy flow status');
      setText(dom.stageProgressValue, lifecycle.title);
      if (dom.stageProgressBar) {
        dom.stageProgressBar.style.width = '0%';
      }
      return;
    }

    const stagePercent = stage.allocation > 0n
      ? Math.min((safeToNumber(stage.sold) / safeToNumber(stage.allocation)) * 100, 100)
      : 0;

    setText(dom.stageProgressLabel, `Stage ${stage.id} allocation`);
    setText(dom.stageProgressValue, `${formatSaleAmount(stage.sold)} / ${formatSaleAmount(stage.allocation)}`);
    if (dom.stageProgressBar) {
      dom.stageProgressBar.style.width = `${Math.max(stagePercent, 0)}%`;
    }
  }

  function renderSummarySections() {
    const firstStage = getFirstStage();
    const lastStage = getLastStage();
    const lifecycle = getLifecycle();

    setText(dom.refundHeadline, firstStage
      ? `${state.presale.stageCount}-stage presale - ${formatPriceCompact(firstStage.priceScaled)} entry`
      : 'Contract-aligned presale');
    setText(dom.refundBody, state.presale.error
      ? 'The website is waiting for a successful BNB Chain read before showing authoritative presale metrics.'
      : `Live contract window ${formatUtc(state.presale.startTs)} to ${formatUtc(state.presale.endTs)}. Prices move from ${formatPriceCompact(firstStage?.priceScaled)} to ${formatPriceCompact(lastStage?.priceScaled)}. Softcap ${formatPayAmount(state.presale.softcap)} and hardcap ${formatPayAmount(state.presale.hardcap)} are enforced on-chain.`);
    setText(dom.refundProofLabel, lifecycle.proofLabel);
    setText(dom.refundProofValue, lifecycle.proofValue);
    setText(dom.refundProofSub, lifecycle.proofSub);

    setText(dom.sectionStartPrice, firstStage ? formatPriceCompact(firstStage.priceScaled) : '--');
    setText(dom.sectionFinalPrice, lastStage ? formatPriceCompact(lastStage.priceScaled) : '--');
    setText(dom.sectionStageCount, state.presale.stageCount ? String(state.presale.stageCount) : '--');
    setText(dom.sectionTokenCap, state.presale.tokenCap > 0n ? formatSaleAmount(state.presale.tokenCap, { maximumFractionDigits: 0 }) : '--');
    setText(dom.sectionSoftcap, state.presale.softcap > 0n ? formatPayAmount(state.presale.softcap, { maximumFractionDigits: 0 }) : '--');
    setText(dom.sectionHardcap, state.presale.hardcap > 0n ? formatPayAmount(state.presale.hardcap, { maximumFractionDigits: 0 }) : '--');

    setText(dom.modesWindowBadge, state.presale.stageCount ? `${state.presale.stageCount} on-chain stages` : 'On-chain stages');
    setText(dom.modesWindowTitle, state.presale.startTs ? `${formatUtc(state.presale.startTs)} -> ${formatUtc(state.presale.endTs)}` : 'Waiting for live window');
    setText(dom.modesWindowDesc, lifecycle.description);

    const stageCaps = state.presale.stages.length > 0
      ? state.presale.stages.map((stage) => formatUnits(stage.walletCap, state.presale.payTokenDecimals, { maximumFractionDigits: 0 }))
      : [];
    setText(dom.modesCapsBadge, state.presale.minBuy > 0n ? `Min ${formatPayAmount(state.presale.minBuy, { maximumFractionDigits: 0 })}` : 'Min buy pending');
    setText(dom.modesCapsTitle, stageCaps.length > 0
      ? `Stage wallet caps: ${stageCaps.join(' / ')} ${state.presale.payTokenSymbol}`
      : 'Stage caps loading');
    setText(dom.modesCapsDesc, state.presale.globalMaxPerWallet > 0n
      ? `Global wallet cap ${formatPayAmount(state.presale.globalMaxPerWallet, { maximumFractionDigits: 0 })}. Token cap ${formatSaleAmount(state.presale.tokenCap, { maximumFractionDigits: 0 })}.`
      : 'Waiting for live cap data.');

    setText(dom.capSoftcap, state.presale.softcap > 0n ? formatPayAmount(state.presale.softcap, { maximumFractionDigits: 0 }) : '--');
    setText(dom.capHardcap, state.presale.hardcap > 0n ? formatPayAmount(state.presale.hardcap, { maximumFractionDigits: 0 }) : '--');
    setText(dom.capSplit, `${config.successLiquidityBps / 100}% / ${config.successMarketingBps / 100}%`);
    setText(dom.capClaim, `${config.immediateClaimBps / 100}% + ${100 - (config.immediateClaimBps / 100)}%`);
  }

  function renderHeroState() {
    const lifecycle = getLifecycle();
    const currentStage = getCurrentStage();
    const firstStage = getFirstStage();
    const lastStage = getLastStage();
    const priceRange = firstStage && lastStage
      ? `${formatPriceCompact(firstStage.priceScaled)} -> ${formatPriceCompact(lastStage.priceScaled)}`
      : '--';

    setText(dom.heroBadge, lifecycle.badge);
    setText(dom.stageIndicatorLabel, lifecycle.key === 'active' ? 'CURRENT STAGE' : 'CONTRACT STATUS');
    setText(dom.stageIndicatorValue, lifecycle.key === 'active' ? String(state.presale.currentStageId) : lifecycle.proofValue.toUpperCase());
    setText(dom.stageIndicatorPrice, lifecycle.key === 'active'
      ? formatPriceScaled(currentStage?.priceScaled)
      : `${formatPayAmount(state.presale.softcap, { maximumFractionDigits: 0 })} softcap`);

    setText(dom.heroStatusLabel, lifecycle.key === 'active' ? 'Current stage' : 'Contract state');
    setText(dom.heroStatusMain, lifecycle.title);
    setText(dom.heroStatusSecondary, lifecycle.key === 'active'
      ? `${formatPriceScaled(currentStage?.priceScaled)} · ${formatPayAmount(currentStage?.walletCap || 0n, { maximumFractionDigits: 0 })} stage wallet cap`
      : `${formatPayAmount(state.presale.softcap, { maximumFractionDigits: 0 })} softcap · ${formatPayAmount(state.presale.hardcap, { maximumFractionDigits: 0 })} hardcap`);
    setText(dom.heroStatusSub, state.presale.error
      ? 'Live contract data could not be verified on BNB Chain.'
      : `Window ${formatUtc(state.presale.startTs)} -> ${formatUtc(state.presale.endTs)} · Price range ${priceRange}`);
  }

  function renderWidgetMeta() {
    const lifecycle = getLifecycle();
    const currentStage = getCurrentStage();
    const firstStage = getFirstStage();
    const lastStage = getLastStage();

    setText(dom.widgetBadge, lifecycle.key === 'active'
      ? `STAGE ${state.presale.currentStageId} OF ${state.presale.stageCount} · BSC`
      : `${lifecycle.proofValue.toUpperCase()} · BSC`);

    setText(dom.stageValue, lifecycle.key === 'active'
      ? `Stage ${state.presale.currentStageId} of ${state.presale.stageCount}`
      : lifecycle.title);
    setText(dom.priceValue, lifecycle.key === 'active'
      ? formatPriceScaled(currentStage?.priceScaled)
      : firstStage && lastStage
        ? `${formatPriceCompact(firstStage.priceScaled)} -> ${formatPriceCompact(lastStage.priceScaled)}`
        : '--');
    setText(dom.nextPriceValue, lifecycle.key === 'active'
      ? (currentStage?.id === state.presale.stageCount
          ? 'Final configured stage'
          : `Next stage: ${formatPriceCompact(getStage(currentStage.id + 1)?.priceScaled)}`)
      : lifecycle.description);

    setText(dom.raisedValue, state.presale.totalRaised >= 0n ? formatPayAmount(state.presale.totalRaised, { maximumFractionDigits: 0 }) : '--');
    const hardcapPercent = state.presale.hardcap > 0n
      ? Math.min((safeToNumber(state.presale.totalRaised) / safeToNumber(state.presale.hardcap)) * 100, 100)
      : 0;
    setText(dom.raisedPct, `${hardcapPercent.toFixed(1)}%`);
    setText(dom.raisedTarget, state.presale.hardcap > 0n ? formatPayAmount(state.presale.hardcap, { maximumFractionDigits: 0 }) : '--');

    renderProgressBars();

    const lifecycleMessage = lifecycle.key === 'active'
      ? `Min ${formatPayAmount(state.presale.minBuy, { maximumFractionDigits: 0 })} · Stage cap ${formatPayAmount(currentStage?.walletCap || 0n, { maximumFractionDigits: 0 })} · Global cap ${formatPayAmount(state.presale.globalMaxPerWallet, { maximumFractionDigits: 0 })}`
      : `Claim path: ${config.immediateClaimBps / 100}% immediate + ${100 - (config.immediateClaimBps / 100)}% over ${config.claimLinearDays} days · Buys blocked while contract is ${lifecycle.proofValue.toLowerCase()}`;
    setText(dom.minNote, lifecycleMessage);

    setText(dom.widgetFooterClaim, `Softcap ${formatPayAmount(state.presale.softcap, { maximumFractionDigits: 0 })} · Hardcap ${formatPayAmount(state.presale.hardcap, { maximumFractionDigits: 0 })}`);
    setText(dom.widgetFooterSecure, `Success split ${config.successLiquidityBps / 100}% LP / ${config.successMarketingBps / 100}% marketing · Claim ${config.immediateClaimBps / 100}% + ${100 - (config.immediateClaimBps / 100)}%`);
    setText(dom.heroFootnote, `Presale contract ${shortAddress(config.presaleAddress)} · Pay token ${state.presale.payTokenSymbol} · Global wallet cap ${formatPayAmount(state.presale.globalMaxPerWallet, { maximumFractionDigits: 0 })}`);
    setText(dom.payTokenAddressNote, `${state.presale.payTokenSymbol} on BSC: ${state.presale.payTokenAddress} - live pay token from the presale contract`);
    setTextByClass('js-pay-token-symbol', state.presale.payTokenSymbol);
    setTextByClass('js-sale-token-symbol', state.presale.saleTokenSymbol);
  }

  function renderStageTable() {
    if (!dom.stagesTableBody) return;
    dom.stagesTableBody.innerHTML = '';

    if (state.presale.error) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6">Live contract data unavailable. Purchases stay blocked until the next successful sync.</td>';
      dom.stagesTableBody.appendChild(row);
      return;
    }

    state.presale.stages.forEach((stage) => {
      const row = document.createElement('tr');
      if (stage.id === state.presale.currentStageId) {
        row.classList.add('row-timed');
      }
      row.innerHTML = `
        <td><strong>${stage.id}</strong></td>
        <td>${formatSaleAmount(stage.allocation, { maximumFractionDigits: 0 })}</td>
        <td class="price-col">${formatPriceCompact(stage.priceScaled)}</td>
        <td>${formatPayAmount(stage.walletCap, { maximumFractionDigits: 0 })}</td>
        <td class="raise-col">${formatPayAmount(stage.raised, { maximumFractionDigits: 0 })}</td>
        <td>${formatSaleAmount(stage.sold, { maximumFractionDigits: 0 })}</td>
      `;
      dom.stagesTableBody.appendChild(row);
    });
  }

  function renderStageChart() {
    if (!dom.chartCanvas || typeof Chart === 'undefined') return;
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }

    if (state.presale.error || state.presale.stages.length === 0) return;

    const labels = state.presale.stages.map((stage) => `Stage ${stage.id}`);
    const allocationData = state.presale.stages.map((stage) => safeToNumber(ethers.formatUnits(stage.allocation, state.presale.saleTokenDecimals)));
    const priceData = state.presale.stages.map((stage) => safeToNumber(stage.priceScaled) / safeToNumber(state.presale.priceScale));

    state.chart = new Chart(dom.chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Allocation',
            data: allocationData,
            backgroundColor: state.presale.stages.map((stage) => stage.id === state.presale.currentStageId ? '#00AA98' : 'rgba(0,170,152,0.28)'),
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Price',
            data: priceData,
            type: 'line',
            borderColor: '#E24B4A',
            backgroundColor: 'rgba(226,75,74,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#E24B4A',
            borderWidth: 2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { size: 10 } },
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#888',
              font: { size: 10 },
              callback: (value) => `${safeToNumber(value / 1000).toFixed(0)}K`,
            },
            title: {
              display: true,
              text: `Allocation (${state.presale.saleTokenSymbol})`,
              color: '#888',
              font: { size: 11 },
            },
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#E24B4A',
              font: { size: 10 },
              callback: (value) => `$${safeToNumber(value).toFixed(4)}`,
            },
            title: {
              display: true,
              text: `Price (${state.presale.payTokenSymbol})`,
              color: '#E24B4A',
              font: { size: 11 },
            },
          },
        },
      },
    });
  }

  function updateInputState(validation) {
    if (!dom.payInput) return;
    const active = validation.lifecycle.key === 'active' && !state.presale.error;
    dom.payInput.disabled = !active;
    if (!active) {
      dom.payInput.placeholder = 'Presale inactive';
      dom.payInput.removeAttribute('max');
      dom.payInput.min = '0';
      dom.payInput.step = '0.01';
      if (dom.receiveOutput) {
        dom.receiveOutput.textContent = '0.00';
      }
      return;
    }

    dom.payInput.placeholder = formatInputValue(state.presale.minBuy, state.presale.payTokenDecimals);
    dom.payInput.min = formatInputValue(state.presale.minBuy, state.presale.payTokenDecimals);
    dom.payInput.step = '0.01';
    if (validation.constraints.maxPayIn > 0n) {
      dom.payInput.max = formatInputValue(validation.constraints.maxPayIn, state.presale.payTokenDecimals);
    } else {
      dom.payInput.removeAttribute('max');
    }
  }

  function renderActionState(validation) {
    renderNetworkWarning();
    updateInputState(validation);

    if (state.account) {
      dom.address.textContent = `Connected: ${shortAddress(state.account)}`;
      dom.address.classList.add('show');
    } else {
      dom.address.textContent = '';
      dom.address.classList.remove('show');
    }

    if (dom.disconnectButton) {
      dom.disconnectButton.classList.toggle('show', !!state.account);
    }

    if (state.wallet.loading) {
      setButtonState('LOADING WALLET STATE', { disabled: true });
      setStep(1);
      setStatus('Refreshing wallet state from BNB Chain.', 'warn');
      return;
    }

    if (!state.account) {
      setButtonState('CONNECT WALLET', { disabled: false });
      setStep(1);
      setStatus(validation.lifecycle.key === 'active' ? validation.reason : validation.lifecycle.description, validation.tone);
      return;
    }

    if (validation.lifecycle.key !== 'active') {
      const closedLabel = validation.lifecycle.key === 'finalized-failure'
        ? 'REFUND ONLY'
        : validation.lifecycle.key === 'finalized-success'
          ? 'PRESALE FINALIZED'
          : validation.lifecycle.key === 'unavailable'
            ? 'LIVE DATA REQUIRED'
            : 'PRESALE CLOSED';
      setButtonState(closedLabel, { disabled: true, mode: 'error-mode' });
      setStep(2);
      const inactiveMessage = getInactiveWalletMessage(validation.lifecycle);
      const combinedMessage = validation.chainOkay
        ? inactiveMessage
        : `${inactiveMessage} Wallet is also connected to the wrong network; switch to BNB Chain for accurate wallet reads.`;
      setStatus(combinedMessage, validation.lifecycle.key === 'unavailable' ? 'err' : 'warn');
      return;
    }

    if (!validation.chainOkay) {
      setButtonState('WRONG NETWORK', { disabled: true, mode: 'error-mode' });
      setStep(1);
      setStatus('Switch wallet to BNB Chain to continue.', 'err');
      return;
    }

    if (!validation.parsed.ok) {
      setButtonState('ENTER AMOUNT', { disabled: true });
      setStep(2);
      setStatus(validation.reason, validation.tone);
      return;
    }

    if (!validation.inputOk) {
      setButtonState('AMOUNT BLOCKED', { disabled: true, mode: 'error-mode' });
      setStep(2);
      setStatus(validation.reason, 'err');
      return;
    }

    const buttonLabel = validation.needsApproval
      ? `APPROVE + BUY ${state.presale.saleTokenSymbol}`
      : `BUY ${state.presale.saleTokenSymbol}`;
    const buttonMode = validation.needsApproval ? 'approve-mode' : 'buying-mode';

    setButtonState(buttonLabel, { disabled: false, mode: buttonMode });
    setStep(validation.needsApproval ? 2 : 3);
    setStatus(validation.reason, validation.tone);
  }

  function refreshQuoteAndActionState() {
    const validation = getValidationState();
    if (dom.receiveOutput) {
      dom.receiveOutput.textContent = validation.inputOk
        ? formatUnits(validation.tokenOut, state.presale.saleTokenDecimals, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';
    }
    renderActionState(validation);
    return validation;
  }

  function getConnectedChainId() {
    if (state.currentEthProvider && typeof state.currentEthProvider.request === 'function') {
      return state.currentEthProvider.request({ method: 'eth_chainId' }).then(normalizeChainId).catch(() => null);
    }
    if (state.browserProvider) {
      return state.browserProvider.getNetwork().then((network) => Number(network.chainId)).catch(() => null);
    }
    return Promise.resolve(null);
  }

  async function loadTokenMetadata(address, fallbackSymbol, fallbackDecimals) {
    const token = new ethers.Contract(address, config.erc20Abi, readProvider);
    try {
      const [symbol, decimals] = await Promise.all([
        token.symbol().catch(() => fallbackSymbol),
        token.decimals().catch(() => fallbackDecimals),
      ]);
      return {
        symbol,
        decimals: Number(decimals),
      };
    } catch (_) {
      return {
        symbol: fallbackSymbol,
        decimals: fallbackDecimals,
      };
    }
  }

  async function loadPresaleState() {
    const presale = new ethers.Contract(config.presaleAddress, config.presaleAbi, readProvider);
    const baseValues = await Promise.all([
      presale.PRICE_SCALE(),
      presale.PRESALE_DURATION(),
      presale.CLAIM_LINEAR_DURATION(),
      presale.saleToken(),
      presale.payToken(),
      presale.saleDecimals(),
      presale.payDecimals(),
      presale.startTs(),
      presale.endTs(),
      presale.softcap(),
      presale.hardcap(),
      presale.minBuy(),
      presale.globalMaxPerWallet(),
      presale.tokenCap(),
      presale.totalRaised(),
      presale.totalSold(),
      presale.finalized(),
      presale.succeeded(),
      presale.finalizedAt(),
      presale.currentStageId(),
    ]);

    const [
      priceScale,
      presaleDuration,
      claimLinearDuration,
      saleTokenAddress,
      payTokenAddress,
      saleDecimals,
      payDecimals,
      startTs,
      endTs,
      softcap,
      hardcap,
      minBuy,
      globalMaxPerWallet,
      tokenCap,
      totalRaised,
      totalSold,
      finalized,
      succeeded,
      finalizedAt,
      currentStageId,
    ] = baseValues;

    const stages = [];
    for (let stageId = 1; stageId <= config.stageScanLimit; stageId += 1) {
      try {
        const [allocation, priceScaled, walletCap, sold, raised] = await presale.stageConfig(stageId);
        stages.push({
          id: stageId,
          allocation,
          priceScaled,
          walletCap,
          sold,
          raised,
        });
      } catch (error) {
        if (stages.length > 0 && extractErrorName(error) === 'InvalidStage') {
          break;
        }
        throw error;
      }
    }

    const payMetadata = await loadTokenMetadata(payTokenAddress, 'USDC', Number(payDecimals));
    const saleMetadata = await loadTokenMetadata(saleTokenAddress, 'GGRD', Number(saleDecimals));

    state.presale.error = null;
    state.presale.priceScale = BigInt(priceScale);
    state.presale.presaleDuration = safeToNumber(presaleDuration);
    state.presale.claimLinearDuration = safeToNumber(claimLinearDuration) || (config.claimLinearDays * 24 * 60 * 60);
    state.presale.saleTokenAddress = saleTokenAddress;
    state.presale.payTokenAddress = payTokenAddress;
    state.presale.saleTokenSymbol = saleMetadata.symbol;
    state.presale.payTokenSymbol = payMetadata.symbol;
    state.presale.saleTokenDecimals = saleMetadata.decimals;
    state.presale.payTokenDecimals = payMetadata.decimals;
    state.presale.saleUnit = 10n ** BigInt(saleMetadata.decimals);
    state.presale.payUnit = 10n ** BigInt(payMetadata.decimals);
    state.presale.startTs = safeToNumber(startTs);
    state.presale.endTs = safeToNumber(endTs);
    state.presale.softcap = BigInt(softcap);
    state.presale.hardcap = BigInt(hardcap);
    state.presale.minBuy = BigInt(minBuy);
    state.presale.globalMaxPerWallet = BigInt(globalMaxPerWallet);
    state.presale.tokenCap = BigInt(tokenCap);
    state.presale.totalRaised = BigInt(totalRaised);
    state.presale.totalSold = BigInt(totalSold);
    state.presale.finalized = Boolean(finalized);
    state.presale.succeeded = Boolean(succeeded);
    state.presale.finalizedAt = safeToNumber(finalizedAt);
    state.presale.currentStageId = safeToNumber(currentStageId);
    state.presale.stages = stages;
    state.presale.stageCount = stages.length;
  }

  async function refreshWalletState() {
    if (!state.account) {
      state.wallet.loading = false;
      state.wallet.chainId = null;
      state.wallet.balance = null;
      state.wallet.allowance = 0n;
      state.wallet.contributed = 0n;
      state.wallet.purchased = 0n;
      state.wallet.claimed = 0n;
      state.wallet.claimable = 0n;
      state.wallet.currentStageContributed = 0n;
      refreshQuoteAndActionState();
      return;
    }

    state.wallet.loading = true;
    renderActionState(getValidationState());

    try {
      const chainId = await getConnectedChainId();
      const payToken = new ethers.Contract(state.presale.payTokenAddress, config.erc20Abi, readProvider);
      const presale = new ethers.Contract(config.presaleAddress, config.presaleAbi, readProvider);
      const stageContributionPromise = state.presale.currentStageId > 0
        ? presale.stageContributed(state.presale.currentStageId, state.account).catch(() => 0n)
        : Promise.resolve(0n);

      const [balance, allowance, contributed, purchased, claimed, claimable, currentStageContributed] = await Promise.all([
        payToken.balanceOf(state.account),
        payToken.allowance(state.account, config.presaleAddress),
        presale.contributed(state.account),
        presale.purchased(state.account),
        presale.claimed(state.account),
        presale.claimable(state.account).catch(() => 0n),
        stageContributionPromise,
      ]);

      state.wallet.chainId = chainId;
      state.wallet.balance = BigInt(balance);
      state.wallet.allowance = BigInt(allowance);
      state.wallet.contributed = BigInt(contributed);
      state.wallet.purchased = BigInt(purchased);
      state.wallet.claimed = BigInt(claimed);
      state.wallet.claimable = BigInt(claimable);
      state.wallet.currentStageContributed = BigInt(currentStageContributed);
    } catch (error) {
      setStatus(`Wallet sync failed: ${clampStatus(error.message || error)}`, 'err');
    } finally {
      state.wallet.loading = false;
      refreshQuoteAndActionState();
    }
  }

  async function refreshAllData() {
    if (state.refreshPromise) return state.refreshPromise;

    state.presale.loading = true;
    state.refreshPromise = (async () => {
      try {
        await loadPresaleState();
      } catch (error) {
        state.presale.error = clampStatus(error.message || error);
      } finally {
        state.presale.loading = false;
      }

      renderSummarySections();
      renderHeroState();
      renderWidgetMeta();
      renderStageTable();
      renderStageChart();

      if (state.account) {
        await refreshWalletState();
      } else {
        refreshQuoteAndActionState();
      }
    })().finally(() => {
      state.refreshPromise = null;
    });

    return state.refreshPromise;
  }

  function getFriendlyTransactionError(error) {
    const presaleError = parseContractError(error, presaleInterface);
    if (presaleError) {
      switch (presaleError.name) {
        case 'PresaleNotActive':
          return `Presale is not active. Contract window ended at ${formatUtc(state.presale.endTs)}.`;
        case 'MinBuyNotMet':
          return `Minimum purchase is ${formatPayAmount(state.presale.minBuy)}.`;
        case 'HardcapExceeded':
          return `Hardcap remaining: ${formatPayAmount(state.presale.hardcap - state.presale.totalRaised)}.`;
        case 'StageWalletCapExceeded':
          return 'Current stage wallet cap would be exceeded.';
        case 'GlobalWalletCapExceeded':
          return 'Global wallet cap would be exceeded.';
        case 'StageTokenAllocationExceeded':
          return 'Current stage allocation has been exhausted.';
        case 'TokenCapExceeded':
          return 'Presale token cap has been reached.';
        case 'SafeERC20FailedOperation':
          return `The ${state.presale.payTokenSymbol} transfer failed. Check balance and allowance.`;
        case 'AlreadyFinalized':
          return 'Presale already finalized. New buys are disabled.';
        default:
          return presaleError.name;
      }
    }

    const message = clampStatus(error?.shortMessage || error?.message || error);
    const lowered = message.toLowerCase();
    if (lowered.includes('user rejected') || lowered.includes('user denied')) {
      return 'Transaction rejected in wallet.';
    }
    if (lowered.includes('insufficient funds')) {
      return 'Insufficient BNB for gas.';
    }
    if (lowered.includes('allowance') || lowered.includes('balance')) {
      return `Check ${state.presale.payTokenSymbol} balance and allowance.`;
    }
    return message || 'Transaction failed.';
  }

  async function ensureBscNetwork(providerLike) {
    const rawChainId = await providerLike.request({ method: 'eth_chainId' });
    const chainId = normalizeChainId(rawChainId);
    state.wallet.chainId = chainId;
    if (chainId === config.chain.id) return;

    setStatus('Switching wallet to BNB Chain.', 'warn');
    try {
      await providerLike.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chain.hexId }],
      });
      state.wallet.chainId = config.chain.id;
    } catch (error) {
      if (error.code === 4902) {
        await providerLike.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: config.chain.hexId,
            chainName: config.chain.name,
            nativeCurrency: config.chain.nativeCurrency,
            rpcUrls: config.chain.rpcUrls,
            blockExplorerUrls: config.chain.blockExplorerUrls,
          }],
        });
        state.wallet.chainId = config.chain.id;
      } else {
        throw error;
      }
    }
  }

  function showWalletList() {
    if (dom.walletList) {
      dom.walletList.style.display = 'flex';
    }
    dom.qrArea?.classList.remove('show');
    setText(dom.walletModalTitle, 'CONNECT WALLET');
    setText(dom.walletModalSubtitle, `Choose your wallet to interact with the live ${state.presale.saleTokenSymbol} widget`);
  }

  function showQrView(uri) {
    if (dom.walletList) {
      dom.walletList.style.display = 'none';
    }
    dom.qrArea?.classList.add('show');
    setText(dom.walletModalTitle, 'SCAN QR CODE');
    setText(dom.walletModalSubtitle, 'Open WalletConnect in your wallet app.');

    if (!uri) {
      if (dom.qrWrap) {
        dom.qrWrap.innerHTML = '<div style="color:#444;font-size:0.75rem">Waiting for WalletConnect URI...</div>';
      }
      if (dom.qrCopyButton) {
        dom.qrCopyButton.style.display = 'none';
      }
      return;
    }

    renderQr(uri);
  }

  function openModal() {
    if (!dom.overlay) return;
    showWalletList();
    dom.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setStatus('Select wallet.', 'warn');
  }

  function closeModal() {
    if (!dom.overlay) return;
    dom.overlay.classList.remove('open');
    document.body.style.overflow = '';
    showWalletList();
    if (!state.connected) {
      const validation = getValidationState();
      setStatus(validation.reason, validation.tone);
    }
  }

  function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src === url);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load failed: ${url}`));
      document.head.appendChild(script);
    });
  }

  async function ensureQrCodeLib() {
    if (typeof window.qrcode === 'function') return;
    if (!state.qrLibPromise) {
      state.qrLibPromise = (async () => {
        const urls = [
          'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
        ];
        let lastError = null;
        for (const url of urls) {
          try {
            await loadExternalScript(url);
            if (typeof window.qrcode === 'function') return;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error('QR generator unavailable.');
      })();
    }
    await state.qrLibPromise;
  }

  async function ensureWalletConnectLib() {
    const hasConstructor = () => {
      const pkg = window['@walletconnect/ethereum-provider'];
      const ctor = pkg?.EthereumProvider || pkg?.default || pkg;
      return Boolean(ctor && typeof ctor.init === 'function');
    };

    if (hasConstructor()) return;

    if (!state.wcLibPromise) {
      state.wcLibPromise = (async () => {
        const urls = [
          'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.23.8/dist/index.umd.js',
          'https://unpkg.com/@walletconnect/ethereum-provider@2.23.8/dist/index.umd.js',
        ];
        let lastError = null;
        for (const url of urls) {
          try {
            await loadExternalScript(url);
            if (hasConstructor()) return;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error('WalletConnect library unavailable.');
      })();
    }

    await state.wcLibPromise;
  }

  function removeProviderListener(providerLike, eventName, handler) {
    if (!providerLike || !handler) return;
    try {
      if (typeof providerLike.off === 'function') {
        providerLike.off(eventName, handler);
      } else if (typeof providerLike.removeListener === 'function') {
        providerLike.removeListener(eventName, handler);
      }
    } catch (_) {
      // no-op
    }
  }

  function fallbackQr(container, uri) {
    if (!container) return;
    const image = document.createElement('img');
    image.style.cssText = 'width:220px;height:220px;border:2px solid #00AA98;display:block;margin:0 auto';
    image.alt = 'WalletConnect QR';
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}&bgcolor=0D0C0B&color=00AA98&margin=2`;
    image.onerror = () => {
      container.innerHTML = `<div style="color:#888;font-size:0.65rem;word-break:break-all;padding:1rem;border:1px solid #333;max-width:220px">${uri}</div>`;
    };
    container.appendChild(image);
  }

  function renderQr(uri) {
    if (!dom.qrWrap || !uri) return;
    dom.qrWrap.innerHTML = '';

    const qrHost = document.createElement('div');
    qrHost.style.cssText = 'width:100%;display:flex;justify-content:center;align-items:center;margin-bottom:10px';
    dom.qrWrap.appendChild(qrHost);

    if (typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(uri);
        qr.make();
        const image = document.createElement('img');
        image.alt = 'WalletConnect QR';
        image.src = qr.createDataURL(4, 2);
        image.style.cssText = 'width:220px;height:220px;border:2px solid #00AA98;display:block;margin:0 auto';
        qrHost.appendChild(image);
      } catch (_) {
        fallbackQr(qrHost, uri);
      }
    } else {
      ensureQrCodeLib().then(() => renderQr(uri)).catch(() => fallbackQr(qrHost, uri));
    }

    if (isMobile) {
      const wcUri = encodeURIComponent(uri);
      const mobileLinks = [
        { name: 'Trust Wallet', url: `https://link.trustwallet.com/wc?uri=${wcUri}`, color: '#3375BB' },
        { name: 'MetaMask', url: `https://metamask.app.link/wc?uri=${wcUri}`, color: '#F6851B' },
        { name: 'Binance', url: `bnc://wc?uri=${wcUri}`, color: '#F0B90B' },
      ];
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;padding:0 1rem';
      mobileLinks.forEach((item) => {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = `Open ${item.name}`;
        link.style.cssText = `display:block;padding:12px;text-align:center;border-radius:8px;font-weight:700;font-size:0.8rem;color:#fff;background:${item.color};text-decoration:none`;
        list.appendChild(link);
      });
      dom.qrWrap.appendChild(list);
    }

    if (dom.qrCopyButton) {
      dom.qrCopyButton.style.display = 'block';
      dom.qrCopyButton.onclick = () => {
        navigator.clipboard.writeText(uri).then(() => {
          dom.qrCopyButton.textContent = 'Copied';
          setTimeout(() => {
            dom.qrCopyButton.textContent = 'Copy URI';
          }, 2000);
        });
      };
    }
  }

  async function clearWalletConnectSessions() {
    const isWalletConnectKey = (key) => key.startsWith('wc@') || key.startsWith('W3M') || key.startsWith('walletconnect') || key.startsWith('wc2@');

    try {
      Object.keys(localStorage).forEach((key) => {
        if (isWalletConnectKey(key)) localStorage.removeItem(key);
      });
    } catch (_) {
      // no-op
    }

    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (isWalletConnectKey(key)) sessionStorage.removeItem(key);
      });
    } catch (_) {
      // no-op
    }

    try {
      if (!window.indexedDB || typeof window.indexedDB.databases !== 'function') return;
      const databases = await window.indexedDB.databases();
      await Promise.all((databases || []).map((database) => new Promise((resolve) => {
        const name = database?.name ? String(database.name) : '';
        if (!name) {
          resolve();
          return;
        }
        const normalized = name.toLowerCase();
        if (!(normalized.includes('walletconnect') || normalized.startsWith('wc') || normalized.includes('w3m'))) {
          resolve();
          return;
        }
        try {
          const request = window.indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        } catch (_) {
          resolve();
        }
      })));
    } catch (_) {
      // no-op
    }
  }

  async function getWalletConnectProvider() {
    if (state.wcProviderSingleton) return state.wcProviderSingleton;
    if (state.wcProviderInitPromise) return state.wcProviderInitPromise;

    state.wcProviderInitPromise = (async () => {
      const pkg = window['@walletconnect/ethereum-provider'];
      const ctor = pkg?.EthereumProvider || pkg?.default || pkg;
      if (!ctor || typeof ctor.init !== 'function') {
        throw new Error('WalletConnect provider constructor unavailable.');
      }

      const providerLike = await ctor.init({
        projectId: config.walletConnectProjectId,
        chains: [config.chain.id],
        methods: [
          'eth_sendTransaction',
          'personal_sign',
          'eth_accounts',
          'eth_requestAccounts',
          'wallet_switchEthereumChain',
          'wallet_addEthereumChain',
        ],
        optionalMethods: [
          'eth_sendRawTransaction',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
          'wallet_getPermissions',
          'wallet_requestPermissions',
          'wallet_watchAsset',
        ],
        events: ['chainChanged', 'accountsChanged', 'connect', 'disconnect'],
        rpcMap: { [config.chain.id]: config.chain.rpcUrls[0] },
        showQrModal: false,
        metadata: {
          name: 'Giggle Reloaded Presale',
          description: 'GGRD contract-aligned presale widget',
          url: 'https://ggrd.me',
          icons: ['https://ggrd.me/img/ggrd-logo-512.png'],
        },
      });

      state.wcProviderSingleton = providerLike;
      return providerLike;
    })().catch((error) => {
      state.wcProviderInitPromise = null;
      throw error;
    });

    return state.wcProviderInitPromise;
  }

  function requestEip6963() {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  function isKnownInjectedProvider(providerLike) {
    return Boolean(providerLike?.isMetaMask || providerLike?.isTrust || providerLike?.isBinance);
  }

  function getOtherInjectedProvider() {
    for (const [rdns, entry] of Object.entries(eip6963Providers)) {
      if (knownWalletRdns.has(rdns)) continue;
      if (entry?.provider && typeof entry.provider.request === 'function') {
        return entry.provider;
      }
    }

    if (Array.isArray(window.ethereum?.providers)) {
      const candidate = window.ethereum.providers.find((providerLike) => providerLike && typeof providerLike.request === 'function' && !isKnownInjectedProvider(providerLike));
      if (candidate) return candidate;
    }

    if (window.ethereum && typeof window.ethereum.request === 'function' && !isKnownInjectedProvider(window.ethereum)) {
      return window.ethereum;
    }

    return null;
  }

  function getLegacyProvider(walletType) {
    switch (walletType) {
      case 'metamask':
        if (window.ethereum?.isMetaMask && !window.ethereum?.isTrust && !window.ethereum?.isBinance) return window.ethereum;
        if (window.ethereum?.providers) {
          return window.ethereum.providers.find((providerLike) => providerLike.isMetaMask && !providerLike.isTrust && !providerLike.isBinance) || null;
        }
        return null;
      case 'trust':
        if (window.trustwallet?.provider) return window.trustwallet.provider;
        if (window.trustwallet) return window.trustwallet;
        if (window.ethereum?.isTrust) return window.ethereum;
        if (window.ethereum?.providers) {
          return window.ethereum.providers.find((providerLike) => providerLike.isTrust) || null;
        }
        return null;
      case 'binance':
        if (window.BinanceChain) return window.BinanceChain;
        if (window.ethereum?.isBinance) return window.ethereum;
        if (window.ethereum?.providers) {
          return window.ethereum.providers.find((providerLike) => providerLike.isBinance) || null;
        }
        return null;
      case 'injected':
        return getOtherInjectedProvider();
      default:
        return null;
    }
  }

  function isWalletAvailable(walletType) {
    const rdnsMap = {
      metamask: 'io.metamask',
      trust: 'com.trustwallet.app',
      binance: 'com.binance.wallet',
    };
    const rdns = rdnsMap[walletType];
    if (rdns && rdns in eip6963Providers) return true;
    return Boolean(getLegacyProvider(walletType));
  }

  function updateWalletButtons() {
    document.querySelectorAll('.wm-wallet-btn[data-rdns]').forEach((button) => {
      const available = isWalletAvailable(button.dataset.wallet);
      const badge = button.querySelector('.wm-wallet-badge-status');
      if (!badge) return;
      badge.textContent = available ? 'DETECTED' : '';
      badge.style.color = available ? 'var(--green)' : '';
    });
  }

  async function handleConnectedProvider(providerLike, account) {
    state.account = account;
    state.currentEthProvider = providerLike;
    state.browserProvider = new ethers.BrowserProvider(providerLike);
    state.signer = await state.browserProvider.getSigner();
    state.connected = true;
    closeModal();
    await refreshWalletState();
  }

  async function connectInjected(walletType) {
    const rdnsMap = {
      metamask: 'io.metamask',
      trust: 'com.trustwallet.app',
      binance: 'com.binance.wallet',
      injected: null,
    };

    let providerLike = null;
    const rdns = rdnsMap[walletType];

    if (rdns && eip6963Providers[rdns]) {
      providerLike = eip6963Providers[rdns].provider;
    }

    if (!providerLike) {
      providerLike = getLegacyProvider(walletType);
    }

    if (walletType === 'injected' && !providerLike) {
      setStatus('No secondary injected wallet detected. Use a specific wallet button or WalletConnect.', 'err');
      return;
    }

    if (!providerLike || typeof providerLike.request !== 'function') {
      const installUrls = {
        metamask: 'https://metamask.io/download/',
        trust: 'https://trustwallet.com/download',
        binance: 'https://www.bnbchain.org/en/binance-wallet',
      };
      setStatus(`Wallet ${walletType} not found. Install it or use WalletConnect.`, 'err');
      if (installUrls[walletType]) {
        window.open(installUrls[walletType], '_blank');
      }
      return;
    }

    try {
      setStatus('Waiting for wallet confirmation.', 'warn');
      const accounts = await providerLike.request({ method: 'eth_requestAccounts' });
      if (!accounts?.length) {
        throw new Error('No account returned by wallet.');
      }
      await ensureBscNetwork(providerLike);
      await handleConnectedProvider(providerLike, accounts[0]);
      providerLike.on?.('accountsChanged', (accountsList) => {
        if (!accountsList.length) {
          disconnectWallet();
        } else if (accountsList[0] !== state.account) {
          location.reload();
        }
      });
      providerLike.on?.('chainChanged', () => location.reload());
      refreshQuoteAndActionState();
    } catch (error) {
      setStatus(clampStatus(error.message || error), 'err');
    }
  }

  function handleWalletConnectDisconnect() {
    if (state.connected) {
      disconnectWallet();
    }
  }

  async function connectWalletConnect() {
    const currentAttempt = ++state.wcConnectAttempt;
    const isLatestAttempt = () => currentAttempt === state.wcConnectAttempt;

    setStatus('Initializing WalletConnect.', 'warn');
    showQrView();

    try {
      await ensureWalletConnectLib();
      await ensureQrCodeLib().catch(() => {});
      if (!isLatestAttempt()) return;

      const providerLike = await getWalletConnectProvider();
      if (!isLatestAttempt()) return;
      state.wcInstance = providerLike;

      removeProviderListener(providerLike, 'display_uri', state.wcUriListener);
      removeProviderListener(providerLike, 'uri', state.wcUriListener);

      let lastUri = '';
      state.wcUriListener = (uri) => {
        if (!isLatestAttempt() || !uri || uri === lastUri) return;
        lastUri = uri;
        showQrView(uri);
      };

      providerLike.on?.('display_uri', state.wcUriListener);
      providerLike.on?.('uri', state.wcUriListener);
      removeProviderListener(providerLike, 'disconnect', handleWalletConnectDisconnect);
      providerLike.on?.('disconnect', handleWalletConnectDisconnect);

      await clearWalletConnectSessions();
      if (!isLatestAttempt()) return;

      const qrTimeout = setTimeout(() => {
        if (!isLatestAttempt() || !dom.qrWrap || dom.qrWrap.querySelector('img')) return;
        dom.qrWrap.innerHTML = '<div style="color:#F3C512;font-size:0.8rem;text-align:center;padding:1rem">QR generation timed out. Try again or use an extension wallet.</div>';
      }, 20000);

      const accounts = await providerLike.enable();
      clearTimeout(qrTimeout);
      if (!isLatestAttempt()) return;
      if (!accounts?.length) {
        throw new Error('No account returned after WalletConnect approval.');
      }

      try {
        await ensureBscNetwork(providerLike);
      } catch (_) {
        state.wallet.chainId = await getConnectedChainId();
      }

      await handleConnectedProvider(providerLike, accounts[0]);

      providerLike.on?.('accountsChanged', (accountsList) => {
        if (!accountsList.length) {
          disconnectWallet();
        } else if (accountsList[0] !== state.account) {
          location.reload();
        }
      });
      providerLike.on?.('chainChanged', () => location.reload());

      refreshQuoteAndActionState();
    } catch (error) {
      if (!isLatestAttempt()) return;
      const message = clampStatus(error.message || error);
      if (message.toLowerCase().includes('user rejected') || message.toLowerCase().includes('modal closed')) {
        setStatus('WalletConnect request cancelled.', 'warn');
        showWalletList();
        return;
      }
      setStatus(message || 'WalletConnect failed.', 'err');
      showQrView();
      if (dom.qrWrap) {
        dom.qrWrap.innerHTML = `<div style="color:#F3C512;font-size:0.72rem;line-height:1.45">WalletConnect error.<br>Try again or use another wallet option.<div style="color:rgba(247,250,252,0.72);font-size:0.65rem;margin-top:0.75rem;word-break:break-word">${message}</div></div>`;
      }
    }
  }

  async function disconnectWallet() {
    state.connected = false;
    state.account = null;
    state.browserProvider = null;
    state.signer = null;
    state.currentEthProvider = null;
    state.wallet.chainId = null;
    state.wallet.balance = null;
    state.wallet.allowance = 0n;
    state.wallet.contributed = 0n;
    state.wallet.purchased = 0n;
    state.wallet.claimed = 0n;
    state.wallet.claimable = 0n;
    state.wallet.currentStageContributed = 0n;

    if (state.wcInstance) {
      try {
        await state.wcInstance.disconnect();
      } catch (_) {
        // no-op
      }
    }

    await clearWalletConnectSessions();
    renderActionState(getValidationState());
    setStatus('Wallet disconnected.', 'warn');
  }

  async function approveExactAllowance(tokenContract, requiredAmount) {
    if (state.wallet.allowance >= requiredAmount) return;

    if (state.wallet.allowance > 0n) {
      setStatus(`Resetting ${state.presale.payTokenSymbol} allowance.`, 'warn');
      const resetTx = await tokenContract.approve(config.presaleAddress, 0n);
      await resetTx.wait();
    }

    setStatus(`Approve ${formatPayAmount(requiredAmount)} in wallet.`, 'warn');
    const approveTx = await tokenContract.approve(config.presaleAddress, requiredAmount);
    await approveTx.wait();
    await refreshWalletState();
  }

  async function approveThenBuy() {
    const validation = refreshQuoteAndActionState();
    if (!state.account || !state.signer) {
      setStatus('Wallet disconnected.', 'err');
      return;
    }
    if (!validation.readyForPurchase) {
      setStatus(validation.reason, validation.tone);
      return;
    }

    if (!state.currentEthProvider || typeof state.currentEthProvider.request !== 'function') {
      setStatus('Wallet provider unavailable.', 'err');
      return;
    }

    try {
      await ensureBscNetwork(state.currentEthProvider);
      state.wallet.chainId = config.chain.id;
    } catch (_) {
      setStatus('Failed to switch wallet to BNB Chain.', 'err');
      return;
    }

    try {
      const payToken = new ethers.Contract(state.presale.payTokenAddress, config.erc20Abi, state.signer);
      const writePresale = new ethers.Contract(config.presaleAddress, config.presaleAbi, state.signer);

      if (validation.needsApproval) {
        setButtonState('APPROVING...', { disabled: true, mode: 'approve-mode' });
        setStep(2);
        await approveExactAllowance(payToken, validation.payIn);
      }

      setButtonState('SIMULATING BUY...', { disabled: true, mode: 'buying-mode' });
      setStep(3);
      setStatus('Simulating buy transaction on BNB Chain.', 'warn');

      await writePresale.buy.staticCall(validation.payIn);
      const gasEstimate = await writePresale.buy.estimateGas(validation.payIn);

      setButtonState('BUYING...', { disabled: true, mode: 'buying-mode' });
      setStatus('Submit the buy transaction in your wallet.', 'warn');

      const tx = await writePresale.buy(validation.payIn, {
        gasLimit: gasEstimate ? (gasEstimate * 12n) / 10n : undefined,
      });

      setStatus('Waiting for on-chain confirmation.', 'warn');
      await tx.wait();

      await refreshAllData();
      setButtonState('PURCHASE CONFIRMED', { disabled: true });
      setStep(4);
      setStatus(`Purchase confirmed: ${formatSaleAmount(validation.tokenOut)} allocated.`, 'ok');
    } catch (error) {
      setStatus(getFriendlyTransactionError(error), 'err');
      await refreshWalletState();
    }
  }

  function bindEvents() {
    $('wm-close')?.addEventListener('click', closeModal);
    dom.overlay?.addEventListener('click', (event) => {
      if (event.target === dom.overlay) {
        closeModal();
      }
    });

    $('wm-qr-back')?.addEventListener('click', async () => {
      state.wcConnectAttempt += 1;
      showWalletList();
      if (state.wcInstance) {
        try {
          await state.wcInstance.disconnect();
        } catch (_) {
          // no-op
        }
      }
      await clearWalletConnectSessions();
      const validation = getValidationState();
      setStatus(validation.reason, validation.tone);
    });

    dom.switchNetworkButton?.addEventListener('click', async () => {
      if (!state.currentEthProvider) {
        setStatus('No wallet connected.', 'err');
        return;
      }
      try {
        await ensureBscNetwork(state.currentEthProvider);
        await refreshWalletState();
      } catch (_) {
        setStatus('Failed to switch network. Change it manually in wallet.', 'err');
      }
    });

    dom.payInput?.addEventListener('input', () => {
      refreshQuoteAndActionState();
    });

    dom.button?.addEventListener('click', () => {
      if (!state.account) {
        openModal();
        return;
      }
      approveThenBuy();
    });

    dom.disconnectButton?.addEventListener('click', disconnectWallet);

    document.querySelectorAll('.wm-wallet-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.dataset.wallet;
        if (type === 'walletconnect') {
          showQrView();
          connectWalletConnect();
        } else {
          closeModal();
          connectInjected(type);
        }
      });
    });

    window.addEventListener('eip6963:announceProvider', (event) => {
      const { info, provider } = event.detail;
      eip6963Providers[info.rdns] = { info, provider };
      updateWalletButtons();
    });

    window.addEventListener('focus', () => {
      refreshAllData();
    });
  }

  function startPolling() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }
    state.refreshTimer = setInterval(() => {
      refreshAllData();
    }, config.pollIntervalMs);
  }

  async function initialize() {
    setButtonState('LOADING LIVE DATA', { disabled: true });
    setStep(1);
    setStatus('Loading live contract data from BNB Chain.', 'warn');

    bindEvents();
    requestEip6963();
    setTimeout(() => {
      requestEip6963();
      updateWalletButtons();
    }, 500);
    setTimeout(() => {
      requestEip6963();
      updateWalletButtons();
    }, 1500);

    await refreshAllData();
    startPolling();
  }

  initialize();
})();

document.querySelectorAll('.faq-q').forEach((question) => {
  question.addEventListener('click', () => {
    const item = question.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((openItem) => openItem.classList.remove('open'));
    if (!wasOpen) {
      item.classList.add('open');
    }
  });
});

document.querySelectorAll('.addr-hash').forEach((element) => {
  element.title = 'Click to copy address';
  element.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(element.textContent.trim());
      element.classList.add('copied');
      setTimeout(() => element.classList.remove('copied'), 1500);
    } catch (_) {
      // clipboard unavailable
    }
  });
});
