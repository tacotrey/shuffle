/* OracleFlow – Remote Shuffler (feature-parity with deck.html)
   ------------------------------------------------------------
   Drop this file on your page via:
   <script id="deck-loader" src="./remote-shuffler.js"
           data-public-id="..."
           data-deck-key="..."
           data-discard-pile="1"
           data-deck-view="2"
           data-card-count="3"
           data-card-size="medium"></script>
*/
(() => {
  const LOADER = document.currentScript;

  // ------------------------ helpers: dataset -> options ------------------------
  const truthy = (v) => {
    if (v == null) return true;
    const s = String(v).trim().toLowerCase();
    return !(s === '' || s === '0' || s === 'false' || s === 'no');
  };
  const normalizeDeckView = (v) => {
    if (v == null) return 'both';
    const s = String(v).trim().toLowerCase();
    if (s === '1' || s === 'collapsed') return 'collapsed';
    if (s === '2' || s === 'fan')       return 'fan';
    return 'both';
  };
  const normalizeCardSize = (v) => {
    if (!v) return '1';
    const s = String(v).trim().toLowerCase();
    if (s === 'small')  return '0.85';
    if (s === 'medium') return '1';
    if (s === 'large')  return '1.2';
    if (s === 'xl' || s === 'xlarge') return '1.4';
    // If numeric string, pass it through
    if (!Number.isNaN(parseFloat(s))) return s;
    return '1';
  };
  const normalizeDrawLimit = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const ATTR = {
    publicId:   LOADER.getAttribute('data-public-id') || (typeof window.__DECK_PUBLIC_ID === 'string' ? window.__DECK_PUBLIC_ID : ''),
    deckKey:    LOADER.getAttribute('data-deck-key')  || '',
    discard:    truthy(LOADER.getAttribute('data-discard-pile')),
    deckView:   normalizeDeckView(LOADER.getAttribute('data-deck-view')),
    drawLimit:  normalizeDrawLimit(LOADER.getAttribute('data-card-count')),
    cardSize:   normalizeCardSize(LOADER.getAttribute('data-card-size')),
  };

  // Create config object from ATTR for compatibility
  const config = {
    publicId: ATTR.publicId,
    deckKey: ATTR.deckKey,
    discardPile: ATTR.discard,
    deckView: ATTR.deckView,
    cardCount: ATTR.drawLimit,
    cardSize: ATTR.cardSize
  };

  // --------------------------- inject CSS (once) -------------------------------
  if (!document.getElementById('oflow-deck-style')) {
    const style = document.createElement('style');
    style.id = 'oflow-deck-style';
    style.textContent = `
:root{
  --brand-blue:#277bfa; --brand-green:#1e9b6e;
  --brand-orange:#ff9e40; --brand-purple:#7748e0;
  --card-aspect:13/20;  --stagger-step:45ms; --stagger-cap:8;
  --fan-ms: .95s;
  --fan-ms-collapse: 1.10s;
  --fan-ms-expand:   1.35s;
  --riffle-ms: 300ms;
  --fan-ease: cubic-bezier(.25,.8,.35,1);
  --fan-ease-collapse: cubic-bezier(.22,.61,.36,1);
  --fan-ease-expand:   cubic-bezier(.16,.84,.44,1);
}

/* base */
* { box-sizing:border-box }
body{
  margin:0; min-height:100vh; background:#ecf3fd;
  display:flex; flex-direction:column; align-items:center;
  font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  padding-bottom: 120px;
}
.config-bar,.controls{
  margin:14px 0 0; display:flex; flex-wrap:wrap;
  align-items:center; justify-content:center; gap:.8em;
  font-size:1.05rem;
}
.config-bar label,.controls label{font-weight:500;color:#224}
select{
  padding:4px 10px; min-width:56px; font-size:1rem;
  border:1.5px solid #b9c7e0; border-radius:7px; background:#f7faff;
  transition:border-color .18s;
}
select:focus{ outline:none; border-color:var(--brand-blue) }
button{
  padding:7px 22px; font-size:1rem; font-weight:500; color:#fff;
  border:0; border-radius:8px; cursor:pointer;
  box-shadow:0 2px 10px 0 #bed3fa22; transition:background .2s, opacity .2s;
}
#collapseBtn{background:var(--brand-blue)}
#shuffleBtn {background:var(--brand-green)}
#resetBtn  {background:var(--brand-orange)}
button:disabled{background:#b8b9c8; cursor:not-allowed; opacity:.6}
.deck-label{
  margin:18px 0 10px; font:700 2.1rem/1.1 system-ui,sans-serif; color:#1e355d; text-align:center;
}

/* deck / pile columns */
.deck-wrapper{
  display: flex; align-items: flex-start; justify-content: center; gap: 48px;
  width: 100%; max-width: none; padding-inline: 0; min-height: 280px;
  padding-top: clamp(12px, 5vh, 60px); position: relative;
  transition: gap var(--fan-ms-expand) var(--fan-ease-expand);
}
.fan-wrapper{
  flex: 0 1 auto; display: flex; flex-direction: column; align-items: center; gap: 6px;
  min-width: 0; height: auto; min-height: 280px; justify-content: flex-end; padding-bottom: 20px;
}
.discard-area{
  display:flex; flex-direction:column; align-items:center; gap:6px;
  cursor:pointer; user-select:none; margin-top:18px;
  opacity: 0; transform: translateX(20px);
  transition: opacity 0.35s ease, transform 0.35s ease;
  pointer-events: none; position: absolute; left: 50%; top: 0; z-index: 10; width: 130px;
}
.deck-info,.discard-info{
  margin-top: 24px; font: 600 1.1rem system-ui,sans-serif; color: #1e355d; text-align: center;
  height: 20px; display:flex; align-items:center; justify-content:center;
}

/* fan tableau */
.fan-tableau{
  width: 99vw; max-width: 900px; margin-top: 0; position: relative;
  display: flex; flex-direction: column; align-items: center;
  border: 2px dashed transparent; border-radius: 12px; transition: border-color .18s;
  overflow: visible; content-visibility: visible; contain: none;
}
.fan-tableau.deck-hover{ border-color:var(--brand-blue) }
.fan-row{
  position: relative; width: 100%;
  height: calc(var(--cw) / var(--card-aspect));
  max-height: none; min-height: 0; margin-top: 0; pointer-events: none; content-visibility: visible;
}
.fan-row:first-child{ margin-top: 0 }

/* cards */
.fan-card{
  --tx:0; --ty:0; --rot:0deg; --stackX:0; --stackY:0; --stackR:0deg; --row:0;
  position: absolute; top: auto; bottom: 0; left: var(--left, 0);
  width: var(--cw); aspect-ratio: var(--card-aspect); min-width: 55px; max-width: 130px;
  border-radius: 16px; overflow: hidden; border: none; cursor: pointer; user-select: none;
  pointer-events: auto; background: transparent;
  transition:left var(--fan-ms) var(--fan-ease), transform var(--fan-ms) var(--fan-ease), box-shadow .18s, filter .18s;
  transition-delay: calc(min(var(--row), var(--stagger-cap)) * var(--stagger-step));
  transform: translate3d(var(--tx),var(--ty),0) rotate(var(--rot)); transform-origin: 50% 50%;
  box-shadow: 0 4px 16px 2px rgba(60,70,120,.16); will-change: transform,left;
  appearance: none; -webkit-appearance: none; padding: 0; -webkit-tap-highlight-color: transparent;
}
.fan-card:focus { outline: none; }
.fan-tableau.is-collapsed .fan-card{
  transform: translate(var(--stackX), var(--stackY)) rotate(var(--stackR));
  transition: transform .85s cubic-bezier(.25,.8,.35,1), box-shadow .18s, filter .18s;
}
.deck-wrapper.collapsed-mode .fan-tableau.is-collapsed .fan-card{
  left: 50%;
  transform: translate(calc(-50% + var(--stackX)), var(--stackY)) rotate(var(--stackR));
}
.fan-card img{ width:100%; height:100%; object-fit:contain; display:block }
.fan-card.is-lifted{ filter:brightness(1.07) saturate(1.13);
  box-shadow:0 16px 40px 10px rgba(39,123,250,.17);
  transform:translate(var(--tx),calc(var(--ty) - 10px)) rotate(var(--rot)) scale(1.04);
}
.fan-card:focus-visible{ outline:3px solid var(--brand-blue); outline-offset:2px }

/* draw limit feedback */
.fan-card.draw-limit-reached{ cursor: not-allowed; }
.fan-tableau.limit-reached{ position: relative; filter: grayscale(.12) brightness(.95); cursor: not-allowed; }
.fan-tableau.limit-reached::before{
  content: ""; position: absolute; inset: 0; border-radius: 12px; background: rgba(255,255,255,.35); pointer-events: none;
}
.fan-card.limit-feedback{ box-shadow: 0 0 0 3px var(--brand-orange) !important; }

/* shuffle riffle */
@keyframes riffle{
  0%   {transform:translate(var(--stackX),var(--stackY)) rotate(calc(var(--stackR) - 3deg));}
  50%  {transform:translate(calc(var(--stackX) + 6px),calc(var(--stackY) + 4px)) rotate(calc(var(--stackR) + 3deg));}
  100% {transform:translate(var(--stackX),var(--stackY)) rotate(var(--stackR));}
}
.is-shuffling .fan-card{animation:riffle .3s ease-in-out}
.fan-tableau:not(.is-collapsed) .fan-card {
  transition:left .85s cubic-bezier(.25,.8,.35,1), transform .85s cubic-bezier(.25,.8,.35,1), box-shadow .18s, filter .18s;
}

/* discard pile */
.discard-area{ display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; user-select:none; margin-top:18px;
  opacity: 0; transform: translateX(20px); transition: opacity 0.15s ease, transform 0.15s ease; pointer-events: none; position: absolute; left: 50%; top: 0; z-index: 10; width: 130px;
}
.deck-wrapper.collapsed-mode .discard-area { opacity: 1; transform: none; pointer-events: auto; position: static; left: auto; }
.discard-stack{
  width:130px; aspect-ratio:var(--card-aspect); border-radius:16px; background:#d8d8d8 center/cover;
  box-shadow:0 6px 16px rgba(0,0,0,.25); opacity:.25; transition:transform .25s, opacity .25s, outline-offset .2s;
}
.discard-area.has-cards .discard-stack{ opacity:1 }
.discard-area.hover .discard-stack{ outline:3px dashed var(--brand-blue); outline-offset:4px }
.discard-badge, .deck-badge{
  padding:2px 10px; border-radius:14px; background:#1e355d; color:#fff; font-weight:600; font-size:.9rem; min-width:36px; text-align:center;
  transform:scale(0); transition:transform .25s;
}
.discard-area.has-cards .discard-badge{ transform:scale(1) }
.deck-badge{ transform:scale(1) }

/* reveal strip */
.selected-area{
  margin:32px auto 40px; width:100%; max-width:1100px; min-height:120px;
  display:flex; flex-wrap:wrap; justify-content:center; gap:16px;
  border:2px dashed transparent; border-radius:12px; transition:border-color .18s;
}
.selected-area.drop-hover{ border-color:var(--brand-blue) }
.selected-card{ display:flex; flex-direction:column; align-items:center; cursor: pointer; transition: transform 0.2s ease; }
.selected-card:hover { transform: scale(1.05); }
.label{ margin-top:6px; font-weight:600; color:#1e355d }



/* flip faces */
.card-wrapper{ width:130px; aspect-ratio:var(--card-aspect); border-radius:16px; perspective:1200px; overflow:hidden }
.card-inner{ position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform 1s cubic-bezier(.26,.6,.23,1); will-change:transform }
.card-wrapper.flipped .card-inner{ transform:rotateY(180deg) }
.card-face{ position:absolute; inset:0; backface-visibility:hidden; border-radius:inherit }
.card-front{ transform:rotateY(180deg) }
.card-back { transform:none }
.card-face img{ width:100%; height:100%; object-fit:contain; display:block }

/* collapsed layout */
.deck-wrapper.collapsed-mode { --cw: 130px; }
.deck-wrapper.collapsed-mode .fan-wrapper,
.deck-wrapper.collapsed-mode .discard-area{
  min-height: calc(var(--cw) / var(--card-aspect) + 40px); height:auto; width:var(--cw);
  justify-content:flex-end; padding-bottom:20px; margin-top:0;
}
.deck-wrapper.collapsed-mode { gap: 16px; }
.deck-wrapper.collapsed-mode .fan-tableau,
.deck-wrapper.collapsed-mode .fan-row { width: var(--cw); margin-inline:auto; }
.deck-wrapper.collapsed-mode .fan-row{ height: calc(var(--cw) / var(--card-aspect)); }
.deck-wrapper.collapsed-mode .discard-stack{ width: 100%; }
.deck-wrapper.collapsed-mode .discard-area{ opacity:1; transform:none; pointer-events:auto; position:static; left:auto }
.fan-tableau.is-collapsed .fan-card{ box-shadow: none !important; }

/* badges + labels */
.deck-badge, .discard-badge{
  order:1; margin-bottom:8px; height:24px; display:flex; align-items:center; justify-content:center; min-height:24px;
}
.deck-info, .discard-info{
  order:2; margin-top:0; height:20px; display:flex; align-items:center; justify-content:center; text-align:center !important;
  font-weight:600; font-size:1.1rem; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#1e355d;
}

/* no global caps on width; let --cw rule */
.fan-card, .discard-stack { max-width:none }
@media (max-width:650px){
  .fan-tableau:not(.is-collapsed) .fan-card,
  .deck-wrapper:not(.collapsed-mode) .discard-stack { max-width: 80px; }
}
@media (max-width:480px){
  .fan-tableau:not(.is-collapsed) .fan-card,
  .deck-wrapper:not(.collapsed-mode) .discard-stack { max-width: 60px; }
}

/* motion prefs */
@media (prefers-reduced-motion: reduce){
  .fan-card, .card-inner { transition:none !important; animation:none !important }
}

/* loading */
.loading-indicator{
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  background:rgba(255,255,255,.95); padding:20px 30px; border-radius:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.1); z-index:1000; display:flex; align-items:center; gap:12px;
  font-weight:500; color:#1e355d; opacity:0; transition:opacity .3s ease;
}
.deck-loading{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; margin-top:24px; opacity:1; transition:opacity .3s ease }
.deck-loading.hidden{ opacity:0; pointer-events:none; height:0; margin:0; overflow:hidden }
.fan-tableau.is-toggling .fan-card{ transition-property:transform, box-shadow, filter;
  transition-delay: calc(min(var(--row), var(--stagger-cap)) * var(--stagger-step));
}
.fan-tableau.is-toggling { contain: paint; }
.fan-tableau.is-toggling .fan-card{ box-shadow:none !important; filter:none !important; will-change:transform; }
.fan-tableau.is-freeze .fan-card { transition:none !important }
.fan-tableau.is-collapsing .fan-card{ transition-duration: var(--fan-ms-collapse); transition-timing-function: var(--fan-ease-collapse) }
.fan-tableau.is-expanding  .fan-card{ transition-duration: var(--fan-ms-expand);   transition-timing-function: var(--fan-ease-expand) }
.fan-tableau.is-collapsed .fan-card { width: var(--cw-collapsed, var(--cw)) }

/* Collapsed deck positioning */
.deck-wrapper.collapsed-mode .fan-tableau.is-collapsed .fan-card,
.deck-wrapper.collapsed-mode .fan-card{
  left: var(--final-collapsed-left, 0px) !important;
  transform:
    translate3d(var(--stackX), var(--stackY), 0)
    rotate(var(--stackR)) !important;
}

.deck-spinner{
  width:24px; height:24px; border:2px solid #e0e7ff; border-top:2px solid var(--brand-blue);
  border-radius:50%; animation:spin 1s linear infinite;
}
.deck-loading-text{ font-size:.9rem; font-weight:500; color:#1e355d; text-align:center }
.loading-indicator.visible{ opacity:1 }
.loading-spinner{ width:20px; height:20px; border:2px solid #e0e7ff; border-top:2px solid var(--brand-blue);
  border-radius:50%; animation:spin 1s linear infinite; }
@keyframes spin{ 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }

/* tiny discard badge near Collapse button */
.discard-badge-small{
  position:absolute; top:-8px; right:-8px; background:var(--brand-orange); color:#fff; border-radius:50%;
  width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;
  box-shadow:0 2px 4px rgba(0,0,0,.2); animation: fadeIn .3s ease;
}
@keyframes fadeIn{ from{opacity:0; transform:scale(.8)} to{opacity:1; transform:scale(1)} }
#collapseBtn{ position:relative }

/* mobile tweaks */
@media(max-width:650px){
  .fan-card, .discard-stack{ min-width:35px }
  .card-wrapper{ width:80px }
  .deck-wrapper.collapsed-mode .fan-row{
    min-height:0; max-height:none; margin-top:0; height: calc(var(--cw) / var(--card-aspect));
  }
  .discard-stack{ width:auto } .deck-wrapper.collapsed-mode .discard-stack{ width:100% }
}
@media(max-width:480px){
  .fan-card, .discard-stack{ min-width:28px }
  .card-wrapper{ width:60px }
  .deck-wrapper.collapsed-mode .fan-row{ margin-top:0 }
  .discard-stack{ width:auto } .deck-wrapper.collapsed-mode .discard-stack{ width:100% }
}

    /* mobile hit-testing & drag reliability */
    .fan-card{ touch-action: none; } /* ensure we receive pointermove/up instead of page scroll */
    .fan-card img{
      pointer-events: none;         /* so events target the button, not the <img> */
      -webkit-user-drag: none;
      user-select: none;
    }
`;
    document.head.appendChild(style);
  }

  // ----------------------------- build HTML UI -------------------------------
  const container = document.createElement('div');
  container.className = 'oflow-mount';

  // Build the same structure deck.html uses (minus the inline loader)
  container.innerHTML = `
  <div class="controls" role="group" aria-label="Deck controls">
    <button id="collapseBtn" aria-pressed="false" title="C" style="display: ${config.deckView === 'fan' ? 'inline-block' : 'none'};">Collapse</button>
    <button id="shuffleBtn"  title="S">Shuffle</button>
    <button id="resetBtn"    title="R">Reset</button>
    <div class="discard-badge-small" id="discardBadgeSmall" style="display:none;">
      <span id="discardCountSmall">0</span>
    </div>
  </div>

  <div class="deck-wrapper">
    <div class="fan-wrapper">
      <div class="fan-tableau" id="fan-tableau" role="list" aria-label="Deck"></div>
      <div class="deck-loading" id="deckLoading">
        <div class="deck-spinner"></div>
        <div class="deck-loading-text">Loading deck...</div>
      </div>
      <div class="deck-badge" id="deckCount" aria-live="polite" style="display:none;">0</div>
      <div class="deck-info" id="deckInfo" style="display:none;">Deck</div>
    </div>

    <div class="discard-area" id="discardArea" aria-label="Discard pile" tabindex="0">
      <div class="discard-stack" id="discardStack"></div>
      <div class="discard-badge" id="discardCount" aria-live="polite">0</div>
      <div class="discard-info">Discard</div>
    </div>
  </div>



  <div class="loading-indicator" id="loadingIndicator">
    <div class="loading-spinner"></div>
    <span>Loading cards...</span>
  </div>
  `;

  // Insert right after the loader script
  LOADER.insertAdjacentElement('afterend', container);

  // --------------------------- deck logic (from deck.html) ---------------------------
  const $ = (id) => document.getElementById(id);
  const fan = $('fan-tableau'),
        pileArea = $('discardArea'), pileStack = $('discardStack');
  const deckCount = $('deckCount'), discardCount = $('discardCount');
  const deckLoading = $('deckLoading'), deckInfo = $('deckInfo');
  const deckWrap = document.querySelector('.deck-wrapper');
  const collapseB = $('collapseBtn'), shuffleB = $('shuffleBtn'), resetB = $('resetBtn');
  const loadingIndicator = $('loadingIndicator');

  /* Mobile detection + click fallback guard */
  const IS_COARSE = window.matchMedia('(pointer: coarse)').matches;
  let sawPointerDown = false;

  // Where should cards fly when revealed?
  const getRevealTarget = () => {
    // Try to find the reveal area created by remote-reveal.js
    const drawnArea = document.getElementById('drawnCardArea');
    if (drawnArea) return drawnArea;
    
    // Fallback to old reveal area if it exists
    const selectedArea = document.querySelector('.selected-area');
    if (selectedArea) return selectedArea;
    
    // Final fallback - create a temporary target or use body
    // If we're in a container, use that; otherwise use body
    const container = document.querySelector('.demo') || document.body;
    return container;
  };

  // Collapsed mode helpers
  const collapsedCW = () => Math.round(130 * cardScale);
  function applyCollapsedSize(){
    const cw = collapsedCW();
    if (deckWrap) deckWrap.style.setProperty('--cw', `${cw}px`);
    if (collapsed) {
      pileStack.style.removeProperty('width');
    } else {
      pileStack.style.width = `${collapsedCW()}px`;
    }
  }

  const API_DECK = "https://yrc76i5e6e.execute-api.us-east-2.amazonaws.com/api/cards";
  const API_URLS = "https://yrc76i5e6e.execute-api.us-east-2.amazonaws.com/api/card-urls";
  const PER_ROW  = 100, FLIP_DELAY = 400;

  // State
  let deck = [], discard = [], revealed = [];
  let cardBackURL = "", PUBLIC_ID = "";
  let collapsed = false, allowDiscard = true, allowCollapse = true;
  let cardScale = parseFloat(ATTR.cardSize) || 1;
  let drawLimit = ATTR.drawLimit || 0;
  let toggling = false;

  // CSS vars read
  const cssTarget = document.documentElement;
  const readMSVar = (name, fallback) => {
    const raw = getComputedStyle(cssTarget).getPropertyValue(name).trim();
    if (!raw) return fallback;
    if (raw.endsWith('ms')) return parseFloat(raw);
    if (raw.endsWith('s'))  return parseFloat(raw) * 1000;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const FAN_MS    = () => readMSVar('--fan-ms', 1100);
  const FAN_MS_COLLAPSE = () => readMSVar('--fan-ms-collapse', FAN_MS());
  const FAN_MS_EXPAND   = () => readMSVar('--fan-ms-expand',   FAN_MS());
  const RIFFLE_MS_VAR = () => readMSVar('--riffle-ms', 560);
  const CARD_ASPECT = (() => {
    const raw = getComputedStyle(cssTarget)
      .getPropertyValue('--card-aspect').trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : (13/20);
  })();

  // raf throttle
  const rafThrottle = fn => {
    let ticking = false;
    return (...args) => {
      if (!ticking){
        requestAnimationFrame(() => { fn(...args); ticking = false; });
        ticking = true;
      }
    };
  };

  // geometry
  const spanDeg = n => (n <= 10 ? 12 : n >= 30 ? 4 : 12 - 8 * (n - 10) / 20);
  const rowGeom = (cnt, cw, W) => {
    const s = spanDeg(cnt), min = -s/2, max = s/2;
    const spread = cnt === 1 ? 0 : (W - cw) / (cnt - 1);
    const vR = Math.max(cw * .09, 8);
    const c = ((cnt - 1) * spread) / 2;
    return Array.from({length: cnt}, (_, i) => ({
      left: i * spread,
      tx: 0,
      ty: -Math.sin((min + (max - min) * i / (cnt - 1)) * Math.PI / 180) * vR,
      rot: min + (max - min) * i / (cnt - 1),
      stackX: c - i * spread, stackY: 0, stackR: 0
    }));
  };
  const styleCard = (el, g, i, total) => {
    el.style.setProperty('--left', g.left + 'px');
    el.style.setProperty('--tx', g.tx + 'px');
    el.style.setProperty('--ty', g.ty + 'px');
    el.style.setProperty('--rot', g.rot + 'deg');
    el.style.setProperty('--stackX', g.stackX + 'px');
    el.style.setProperty('--stackY', g.stackY + 'px');
    el.style.setProperty('--stackR', g.stackR + 'deg');
    el.style.setProperty('--i', i || 0);
    el.style.setProperty('--mid', total ? (total - 1) / 2 : 0);
    el.style.setProperty('--i-del', i % 8);
  };

  const tidyRows = () => {
    const isCollapsed = fan.classList.contains('is-collapsed');
    if (isCollapsed){
      document.querySelectorAll('.fan-row').forEach(r => r.style.marginTop = '0');
      return;
    }
    const narrow   = fan.offsetWidth < 600;
    const overlap  = narrow ? 0.85 : 0.60;
    const rows     = document.querySelectorAll('.fan-row');
    rows.forEach((r, i) => {
      if (i === 0){ r.style.marginTop = '0'; return; }
      const cw = parseFloat(r.dataset.cw) || 130;
      const h  = cw / CARD_ASPECT;
      r.style.marginTop = `-${(h * overlap).toFixed(2)}px`;
    });
  };
  const updateZ = () => {
    document.querySelectorAll('.fan-row').forEach((row,r)=>{
      [...row.children]
        .sort((a,b)=>a.offsetLeft - b.offsetLeft)
        .forEach((c,i)=>c.style.zIndex = r * PER_ROW + i);
    });
  };

  const updateDrawLimitState = () => {
    const limitReached = drawLimit > 0 && revealed.length >= drawLimit;
    fan.classList.toggle('limit-reached', limitReached);
    document.querySelectorAll('.fan-card').forEach(card => {
      card.classList.toggle('draw-limit-reached', limitReached);
    });
  };

  const updateCounts = () => {
    deckCount.textContent = deck.length;
    discardCount.textContent = discard.length;
    const has = discard.length > 0;
    pileArea.classList.toggle('has-cards', has);
    if (has) pileStack.setAttribute('draggable','true');
    else     pileStack.removeAttribute('draggable');

    const smallBadge = $('discardBadgeSmall');
    const smallCount = $('discardCountSmall');
    if (smallBadge && smallCount) {
      smallCount.textContent = discard.length;
      if (!collapsed && discard.length > 0) {
        smallBadge.style.display = 'flex';
      } else {
        smallBadge.style.display = 'none';
      }
    }
    updateDrawLimitState();

    // event for external listeners
    try { window.dispatchEvent(new CustomEvent('oflow:discardChanged', { detail:{ count: discard.length } })); } catch {}
  };

  const showDeckLoaded = () => {
    if (deckLoading){
      deckLoading.classList.add('hidden');
      const onEnd = () => {
        deckLoading.style.display = 'none';
        deckLoading.removeEventListener('transitionend', onEnd);
      };
      deckLoading.addEventListener('transitionend', onEnd);
    }
    if (deckCount) deckCount.style.display = 'flex';
    if (deckInfo)  deckInfo.style.display  = 'flex';
    updateCounts();
    try { window.dispatchEvent(new CustomEvent('oflow:deckLoaded', { detail:{ deckSize: deck.length } })); } catch {}
  };

  const flipHTML = c => `
    <div class="selected-card" role="group" aria-label="${c.name || 'Card'}" data-card-id="${c.id}">
      <div class="card-wrapper">
        <div class="card-inner">
          <div class="card-face card-front"><img alt="${c.name || 'front'}" src="${c.url}"></div>
          <div class="card-face card-back"><img alt="back" src="${cardBackURL}"></div>
        </div>
      </div>
      ${c.name ? `<div class="label">${c.name}</div>` : ''}
    </div>`;

  async function fetchWithRetry(url, opt = {}, tries = 3, delay = 350){
    let last;
    for(let i=0;i<tries;i++){
      try{
        const res = await fetch(url, opt);
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'No error details available');
          console.error(`HTTP ${res.status} error for ${url}:`, errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res;
      }catch(e){
        last = e;
        console.warn(`Attempt ${i+1}/${tries} failed for ${url}:`, e.message);
        if (i < tries - 1) await new Promise(r=>setTimeout(r, delay * Math.pow(2,i)));
      }
    }
    throw last;
  }

  // image loading
  const imageCache = Object.create(null);
  let loadingQueue = [];
  let isLoading = false;

  async function getCardImageURL(key){
    if (imageCache[key]) return imageCache[key];
    const body = ATTR.publicId
      ? {filenames:[key], public_id:ATTR.publicId}
      : {filenames:[key]};
    const resp = await fetchWithRetry(API_URLS,{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r=>r.json());
    const url = (resp.images || []).find(i=>i.key === key)?.url;
    if (url) {
      imageCache[key] = url;
      if (window.cardImageMap) window.cardImageMap[key] = url;
    }
    return url;
  }

  async function ensureFront(card, {priority=false} = {}){
    if (card.url) return card.url;
    const url = await getCardImageURL(card.key);
    if (!url) return null;
    if (priority){
      const im = new Image(); im.src = url;
      try { if (im.decode) await im.decode(); } catch {}
    } else {
      const im = new Image(); im.loading = 'eager'; im.src = url;
    }
    card.url = url;
    if (window.cardImageMap) window.cardImageMap[card.key] = url;
    return url;
  }

  async function processLoadingQueue() {
    if (isLoading || loadingQueue.length === 0) return;
    isLoading = true;
    while (loadingQueue.length > 0) {
      const { card, priority = false } = loadingQueue.shift();
      try { await ensureFront(card, { priority }); } catch (e) { console.warn('Failed to load card:', card.key, e); }
    }
    isLoading = false;
  }
  function queueCardLoad(card, priority = false) { loadingQueue.push({ card, priority }); processLoadingQueue(); }

  const io = null; // no intersection preloading

  const idleWarm = () => {
    const warm = async () => { /* intentional no-op preloading path */ };
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 2000 });
    else setTimeout(warm, 300);
  };

  function buildFanFast() {
    fan.innerHTML = '';
    const W = fan.offsetWidth;
    const rows = Math.ceil(deck.length / PER_ROW);
    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++){
      const slice = deck.slice(r * PER_ROW, (r + 1) * PER_ROW);
      const row = document.createElement('div');
      row.className = 'fan-row';
      row.setAttribute('role', 'list');
      frag.appendChild(row);

      const MAX_W = 140, MIN_W = 90;
      const cols = Math.min(slice.length, 8);
      const overlapFactor = collapsed ? 1 : 0.6;
      let baseCw = Math.min(MAX_W, Math.max(MIN_W, W / (cols * overlapFactor + 0.25)));
      if (collapsed) baseCw = 130;
      const cw = Math.round(baseCw * cardScale);
      row.style.setProperty('--cw', `${cw}px`);
      row.dataset.cw = cw;

      const geom = rowGeom(slice.length, cw, W);
      slice.forEach((card, i) => {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'fan-card';
        c.dataset.id = card.id;
        c.setAttribute('role', 'listitem');
        c.setAttribute('aria-label', card.name || `Card ${card.id}`);
        c.draggable = !IS_COARSE;   // disable native DnD on touch; we use Pointer Events instead
        c.style.setProperty('--row', r);
        styleCard(c, geom[i], i, slice.length);
        c.innerHTML = `<img alt="back" src="${cardBackURL}" loading="eager">`;
        row.appendChild(c);
      });
    }
    fan.appendChild(frag);
    tidyRows(); updateZ(); showDeckLoaded(); syncDiscardSize(); updateDrawLimitState();
  }

  function flyTo(cardEl, destination, html, onDone, scale=1, autoFlip=true){
    const sRect = cardEl.getBoundingClientRect();
    let final = null; let endX, endY;

    if (html){
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      final = tmp.firstElementChild;
      Object.assign(final.style, { visibility:'hidden', position:'absolute', opacity:0 });
      destination.appendChild(final);
      const fRect = final.getBoundingClientRect();
      endX = fRect.left - sRect.left;
      endY = fRect.top  - sRect.top;
    } else {
      const dRect = destination.getBoundingClientRect();
      endX = (dRect.left + dRect.width/2  - sRect.width/2)  - sRect.left;
      endY = (dRect.top  + dRect.height/2 - sRect.height/2) - sRect.top;
    }

    const clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
      position:'fixed', left:sRect.left+'px', top:sRect.top+'px',
      width:sRect.width+'px', height:sRect.height+'px', margin:0,
      zIndex:9999, pointerEvents:'none', background:'transparent',
      transition:'transform .65s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.4,.5,.5,1)',
      boxShadow:'0 8px 40px 8px rgba(39,123,250,.09)'
    });
    document.body.appendChild(clone);
    cardEl.style.visibility = 'hidden';

    requestAnimationFrame(()=>{
      clone.style.transform = `translate(${endX}px, ${endY}px) scale(${scale})`;
      clone.style.opacity = .38;
    });

    const onEnd = ()=>{
      clone.remove();
      if (final){
        Object.assign(final.style, { visibility:'', position:'', opacity:'' });
        if (autoFlip){
          setTimeout(()=>{ final.querySelector('.card-wrapper')?.classList.add('flipped'); }, FLIP_DELAY);
        }
      }
      cardEl.remove();
      onDone && onDone(final);
    };
    clone.addEventListener('transitionend', onEnd, {once:true});
  }

  async function toReveal(card, el, fly=true){
    // Show loading indicator
    loadingIndicator.classList.add('visible');
    
    // Load card image with priority
    const loadCard = async () => {
      if (card.url) {
        // Card already has URL, hide loading and finalize
        loadingIndicator.classList.remove('visible');
        finalize();
        return;
      }
      
      try {
        await ensureFront(card, {priority:true});
        loadingIndicator.classList.remove('visible');
        finalize();
      } catch (error) {
        console.warn('Failed to load card image:', error);
        loadingIndicator.classList.remove('visible');
        finalize();
      }
    };

    const finalize = () => {
      deck = deck.filter(c => c.id !== card.id);
      revealed.push(card);
      updateCounts();
      
      // Call the reveal functionality from remote-reveal.js
      if (window.renderDrawn) {
        window.renderDrawn(revealed);
      }
      
      // Ensure loading indicator is hidden
      loadingIndicator.classList.remove('visible');
    };

    if (fly) {
      const dest = getRevealTarget();
      flyTo(el, dest, '', () => {
        if (el) el.remove();
        loadCard();
      }, 1.07, false);
    } else {
      if (el) el.remove();
      updateCounts();
      loadCard();
    }
  }

  function toDiscard(card, el, fly=true){
    if (!allowDiscard) return;
    const finalize = ()=>{
      deck = deck.filter(c => c.id !== card.id);
      discard.push(card);
      updateCounts();
    };
    if (fly) flyTo(el, pileStack, '', finalize, 0.93);
    else { el.remove(); finalize(); }
  }

  function restorePile(){
    if (!allowDiscard || !discard.length) return;
    deck.push(discard.pop());
    buildFan(); updateCounts();
  }



  function buildFan(){
    fan.innerHTML = '';
    const W = fan.offsetWidth;
    const rows = Math.ceil(deck.length / PER_ROW);
    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++){
      const slice = deck.slice(r * PER_ROW, (r + 1) * PER_ROW);
      const row = document.createElement('div');
      row.className = 'fan-row';
      row.setAttribute('role', 'list');
      frag.appendChild(row);

      const MAX_W = 140, MIN_W = 90;
      const cols = Math.min(slice.length, 8);
      const overlapFactor = collapsed ? 1 : 0.6;
      let baseCw = Math.min(MAX_W, Math.max(MIN_W, W / (cols * overlapFactor + 0.25)));
      if (collapsed) baseCw = 130;
      const cw = Math.round(baseCw * cardScale);
      row.style.setProperty('--cw', `${cw}px`);
      row.dataset.cw = cw;

      const geom = rowGeom(slice.length, cw, W);
      slice.forEach((card, i) => {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'fan-card';
        c.dataset.id = card.id;
        c.setAttribute('role','listitem');
        c.setAttribute('aria-label', card.name || `Card ${card.id}`);
        c.draggable = !IS_COARSE;   // disable native DnD on touch; we use Pointer Events instead
        c.style.setProperty('--row', r);
        styleCard(c, geom[i], i, slice.length);
        const imgSrc = card.url || cardBackURL;
        c.innerHTML = `<img alt="${card.url ? 'front' : 'back'}" src="${imgSrc}" loading="eager">`;
        if (!card.url) queueCardLoad(card, r === 0 && i < 3);
        row.appendChild(c);
      });
    }

    fan.appendChild(frag);
    tidyRows(); updateZ(); updateCounts(); syncDiscardSize(); updateDrawLimitState();

    if (deck.length > 0) {
      const firstCards = deck.slice(0, Math.min(5, deck.length));
      firstCards.forEach((card, index) => {
        if (!card.url) setTimeout(() => queueCardLoad(card, true), index * 50);
      });
    }
  }

  function syncDiscardSize(){
    const base = 130;
    pileStack.style.width = (base * cardScale) + 'px';
  }




  const recalc = (mode /* 'collapsed' | 'fan' | undefined */) => {
    const rows = document.querySelectorAll('.fan-row');
    rows.forEach(row => {
      const cards = [...row.children];
      if (!cards.length) return;

      const MAX_W = 140, MIN_W = 90;
      const cols = Math.min(cards.length, 8);

      const useCollapsed = mode ? (mode === 'collapsed') : collapsed;
      const overlapFactor = useCollapsed ? 1 : 0.6;

      const cw = useCollapsed
        ? collapsedCW()
        : Math.round(Math.min(MAX_W, Math.max(MIN_W,
            fan.offsetWidth / (cols * overlapFactor + 0.25))) * cardScale);

      const W = useCollapsed ? cw : fan.offsetWidth;

      row.style.setProperty('--cw', `${cw}px`);
      row.dataset.cw = cw;

      const geom = rowGeom(cards.length, cw, W);
      cards.forEach((c, i) => styleCard(c, geom[i], i, cards.length));
    });

    tidyRows(); updateZ(); syncDiscardSize();
  };

  // Helper function to log card state for debugging
  const logCardState = (stage) => {
    const card = document.querySelector('.fan-card');
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const computedStyle = getComputedStyle(card);
    const fan = document.querySelector('.fan-tableau');
    const deckWrapper = document.querySelector('.deck-wrapper');
    
    console.log(`=== ${stage} ===`);
    console.log('Card position:', rect);
    console.log('Card size:', { width: rect.width, height: rect.height });
    console.log('Computed styles:');
    console.log('  transform:', computedStyle.transform);
    console.log('  left:', computedStyle.left);
    console.log('  position:', computedStyle.position);
    
    // Check if CSS rules are matching
    const hasCollapsedMode = deckWrapper && deckWrapper.classList.contains('collapsed-mode');
    const hasIsCollapsed = fan && fan.classList.contains('is-collapsed');
    console.log('CSS rule matching check:');
    console.log('  .deck-wrapper.collapsed-mode:', hasCollapsedMode);
    console.log('  .fan-tableau.is-collapsed:', hasIsCollapsed);
    console.log('  Rule should match:', hasCollapsedMode && hasIsCollapsed);
    
    console.log('CSS Variables:');
    console.log('  --stackX:', card.style.getPropertyValue('--stackX'));
    console.log('  --left:', card.style.getPropertyValue('--left'));
    console.log('  --tx:', card.style.getPropertyValue('--tx'));
    console.log('  --ty:', card.style.getPropertyValue('--ty'));
    console.log('  --rot:', card.style.getPropertyValue('--rot'));
    console.log('  --final-collapsed-left:', card.style.getPropertyValue('--final-collapsed-left'));
  };

  // Helper function to calculate individual card collapse positions
  const calculateIndividualCardPositions = () => {
    const cards = document.querySelectorAll('.fan-card');
    
    // Get the target collapsed tableau element (the highlighted area)
    const targetTableau = document.querySelector('.fan-tableau.is-collapsed');
    if (!targetTableau) {
      console.log('Target tableau not found, using fallback positioning');
      return;
    }
    
    const targetRect = targetTableau.getBoundingClientRect();
    
    console.log('=== SNAPPING TO HIGHLIGHTED AREA ===');
    console.log('Target tableau rect:', targetRect);
    console.log('Target left position:', targetRect.left);

    cards.forEach((card, index) => {
      // Get the card's offset parent (the containing block)
      const parent = card.offsetParent || card.closest('.fan-tableau');
      const parentRect = parent.getBoundingClientRect();

      // Snap to the exact left position of the highlighted area
      const leftRelativeToParent = targetRect.left - parentRect.left;

      // Set the final position relative to the parent
      card.style.setProperty('--final-collapsed-left', leftRelativeToParent + 'px');

      if (index === 0) {
        console.log('First card details:');
        console.log('  Parent rect:', parentRect);
        console.log('  Parent left:', parentRect.left);
        console.log('  Target left:', targetRect.left);
        console.log('  Relative to parent left:', leftRelativeToParent);
        console.log('  Set --final-collapsed-left to:', leftRelativeToParent + 'px');
      }
    });

    console.log('Snapped all cards to highlighted area for', cards.length, 'cards');
  };

  function setCollapsed(shouldCollapse){
    const collapseMs = FAN_MS_COLLAPSE();
    const expandMs   = FAN_MS_EXPAND();
    toggling = true;

    if (shouldCollapse && !collapsed){
      // Log initial fanned state
      logCardState('FANNED OUT STATE (before collapse)');
      
      fan.classList.add('is-collapsing');
      // Don't recalc during collapse - preserve the existing fan geometry

      requestAnimationFrame(() => {
        fan.classList.add('is-collapsed');
        collapsed = true;
        collapseB.textContent = 'Fan Out';
        
        // Log state after cards have collapsed but before switching to collapsed mode
        setTimeout(() => {
          logCardState('COLLAPSED CARDS (before switching to collapsed mode)');
        }, collapseMs / 2); // Log halfway through the collapse animation
      });

      setTimeout(() => {
        fan.classList.add('is-freeze');
        deckWrap && deckWrap.classList.add('collapsed-mode');
        applyCollapsedSize();
        recalc('collapsed');
        
        // Calculate individual card collapse positions after collapsed geometry is calculated
        calculateIndividualCardPositions();
        
        tidyRows();
        requestAnimationFrame(() => {
          fan.classList.remove('is-freeze');
          fan.classList.remove('is-collapsing');
          toggling = false;
          
          // Log final collapsed state
          setTimeout(() => {
            logCardState('FINAL COLLAPSED STATE');
          }, 100);
        });
      }, collapseMs + 10);

    } else if (!shouldCollapse && collapsed){
      // Log collapsed state before fan out
      logCardState('COLLAPSED STATE (before fan out)');
      
      fan.classList.add('is-freeze');
      deckWrap && deckWrap.classList.remove('collapsed-mode');
      applyCollapsedSize();
      recalc('fan'); tidyRows();

      requestAnimationFrame(() => {
        fan.classList.remove('is-freeze');
        fan.classList.add('is-expanding');
        fan.classList.remove('is-collapsed');
        collapsed = false;
        collapseB.textContent = 'Collapse';
      });

      setTimeout(() => {
        fan.classList.remove('is-expanding');
        toggling = false;
      }, expandMs + 10);

    } else {
      toggling = false;
    }
  }

  const shuffleArr = a => { for(let i=a.length-1;i>0;i--){ const j=(Math.random()* (i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } };
  const riffle = () => {
    fan.classList.add('is-shuffling');
    setTimeout(() => fan.classList.remove('is-shuffling'), 300);
  };
  const shuffleDeck = () => { shuffleArr(deck); buildFanFast(); riffle(); };

  // Drag & drop
  function makeDragGhost(w, h, src){
    const g = new Image(); g.src = src;
    Object.assign(g.style, { width: w+'px', height: h+'px', borderRadius:'16px', position:'absolute', top:'-999px', left:'-999px' });
    document.body.appendChild(g);
    return g;
  }

  pileStack.addEventListener('dragstart', e=>{
    if (!allowDiscard || !discard.length) return;
    e.dataTransfer.setData('text/x-pile', 'top');
    const g = makeDragGhost(pileStack.offsetWidth, pileStack.offsetHeight, cardBackURL);
    e.dataTransfer.setDragImage(g, g.offsetWidth/2, g.offsetHeight/2);
    setTimeout(()=>g.remove(), 0);
  });

  let deckHover = 0;
  fan.addEventListener('dragenter', e=>{
    if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard){
      deckHover++; fan.classList.add('deck-hover');
    }
  });
  fan.addEventListener('dragleave', e=>{
    if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard){
      deckHover = Math.max(0, --deckHover);
      if (!deckHover) fan.classList.remove('deck-hover');
    }
  });
  fan.addEventListener('dragover', e=>{
    if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard) e.preventDefault();
  });
  fan.addEventListener('drop', e=>{
    if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard){
      e.preventDefault(); deckHover = 0; fan.classList.remove('deck-hover');
      restorePile();
    }
  });

  ['dragenter','dragover'].forEach(evt=>pileArea.addEventListener(evt, e=>{
    if (!allowDiscard) return;
    e.preventDefault(); pileArea.classList.add('hover');
  }));
  ['dragleave','drop'].forEach(evt=>pileArea.addEventListener(evt, ()=>{ pileArea.classList.remove('hover'); }));
  pileArea.addEventListener('drop', e=>{
    if (!allowDiscard) return;
    e.preventDefault();
    const id = +e.dataTransfer.getData('text/plain');
    const el = fan.querySelector(`.fan-card[data-id='${id}']`);
    const card = deck.find(c=>c.id === id);
    if (card && el) toDiscard(card, el, false);
  });



  // Delegation: click/drag
  fan.addEventListener('click', e=>{
    // Only handle click if a pointerdown never fired (some browsers w/ PointerEvent still miss the sequence)
    if (sawPointerDown) return;
    
    const el = e.target.closest('.fan-card'); if (!el) return;
    const id = +el.dataset.id;
    const card = deck.find(c=>c.id === id);
    if (!card) return;

    if (drawLimit > 0 && revealed.length >= drawLimit) {
      el.classList.add('limit-feedback'); setTimeout(() => el.classList.remove('limit-feedback'), 150);
      return;
    }
    if (!card.url) {
      loadingQueue.unshift({ card, priority: true });
      processLoadingQueue();
      loadingIndicator.classList.add('visible');
      loadingIndicator.querySelector('span').textContent = 'Loading card...';
    }
    toReveal(card, el, true);
  });

  fan.addEventListener('mousedown', e=>{
    if (e.button !== 2) return;
    const el = e.target.closest('.fan-card'); if (!el || !allowDiscard) return;
    e.preventDefault(); e.stopPropagation();
    const id = +el.dataset.id;
    const card = deck.find(c=>c.id === id);
    if (card) toDiscard(card, el, true);
  });

  fan.addEventListener('contextmenu', e=>{
    if (e.target.closest('.fan-card')) e.preventDefault();
  });

  fan.addEventListener('dragstart', e=>{
    if (IS_COARSE) return;  // prevent iOS oddities
    const el = e.target.closest('.fan-card'); if (!el) return;
    const id = +el.dataset.id;
    const card = deck.find(c=>c.id === id); if (!card) return;
    e.dataTransfer.setData('text/plain', id);
    const g = makeDragGhost(el.offsetWidth, el.offsetHeight, cardBackURL);
    e.dataTransfer.setDragImage(g, g.offsetWidth/2, g.offsetHeight/2);
    el.style.opacity = '0'; el._ghost = g;
  });
  fan.addEventListener('dragend', e=>{
    const el = e.target.closest('.fan-card'); if (!el) return;
    if (el.isConnected) el.style.opacity = '1';
    el._ghost?.remove(); el._ghost = null;
  });

  // ---------- Unified pointer (mouse/touch/pen) tap + drag ----------
  let pointerDrag = {
    active: false,
    id: null,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    cardEl: null,
    cardData: null,
    ghost: null,
    moved: false,
    startedAt: 0
  };

  const DRAG_THRESHOLD_PX = 10;

  function cleanupPointerDrag() {
    if (pointerDrag.cardEl) {
      pointerDrag.cardEl.style.opacity = '';
      pointerDrag.cardEl.style.transform = '';
      pointerDrag.cardEl.style.transition = '';
    }
    pointerDrag.ghost?.remove();
    pileArea.classList.remove('hover');
    pointerDrag = {
      active:false, id:null,
      startX:0, startY:0, lastX:0, lastY:0,
      cardEl:null, cardData:null, ghost:null,
      moved:false, startedAt:0
    };
  }

  fan.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.fan-card');
    if (!el || toggling) return;
    if (e.button != null && e.button !== 0) return; // primary only

    sawPointerDown = true;

    const id = +el.dataset.id;
    const card = deck.find(c => c.id === id);
    if (!card) return;

    pointerDrag.active = true;
    pointerDrag.id = e.pointerId;
    pointerDrag.cardEl = el;
    pointerDrag.cardData = card;
    pointerDrag.startX = pointerDrag.lastX = e.clientX;
    pointerDrag.startY = pointerDrag.lastY = e.clientY;
    pointerDrag.startedAt = Date.now();
    pointerDrag.moved = false;

    // On some iOS builds, capturing the pointer can swallow bubbling to ancestors.
    // We rely on document-level move/up listeners, so skip capture.
    // el.setPointerCapture?.(e.pointerId);

    el.style.opacity = '0.85';
    el.style.transform = 'scale(1.04)';

    e.preventDefault(); // stop scroll / long-press
  }, { passive: false });

  // Document-level move/up to survive capture/retargeting and leaving the deck bounds
  document.addEventListener('pointermove', (e) => {
    if (!pointerDrag.active || e.pointerId !== pointerDrag.id) return;

    const dx = e.clientX - pointerDrag.startX;
    const dy = e.clientY - pointerDrag.startY;

    if (!pointerDrag.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      pointerDrag.moved = true;

      // Create a ghost element that tracks the pointer
      const rect = pointerDrag.cardEl.getBoundingClientRect();
      const g = pointerDrag.cardEl.cloneNode(true);
      Object.assign(g.style, {
        position: 'fixed',
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: '0.85',
        borderRadius: getComputedStyle(pointerDrag.cardEl).borderRadius || '16px',
        transition: 'none',
        transform: 'none'
      });
      document.body.appendChild(g);
      pointerDrag.ghost = g;

      // Hide the original just a bit while dragging
      pointerDrag.cardEl.style.opacity = '0.3';
    }

    if (pointerDrag.ghost) {
      const gw = pointerDrag.ghost.offsetWidth;
      const gh = pointerDrag.ghost.offsetHeight;
      pointerDrag.ghost.style.top = (e.clientY - gh / 2) + 'px';
      pointerDrag.ghost.style.left = (e.clientX - gw / 2) + 'px';

      // Visual hover for discard pile (even if it has pointer-events: none)
      const r = pileArea.getBoundingClientRect();
      const overDiscard = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const cs = getComputedStyle(pileArea);
      const pileVisible = r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
      pileArea.classList.toggle('hover', overDiscard && pileVisible && allowDiscard);
    }

    pointerDrag.lastX = e.clientX;
    pointerDrag.lastY = e.clientY;

    // Avoid page scroll on touch
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (!pointerDrag.active || e.pointerId !== pointerDrag.id) return;

    const duration = Date.now() - pointerDrag.startedAt;
    const wasTap = !pointerDrag.moved && duration < 300;

    const card = pointerDrag.cardData;
    const el = pointerDrag.cardEl;

    if (wasTap) {
      if (drawLimit > 0 && revealed.length >= drawLimit) {
        el.classList.add('limit-feedback');
        setTimeout(() => el.classList.remove('limit-feedback'), 150);
        return cleanupPointerDrag();
      }
      if (!card.url) {
        loadingQueue.unshift({ card, priority: true });
        processLoadingQueue();
        loadingIndicator.classList.add('visible');
        loadingIndicator.querySelector('span').textContent = 'Loading card...';
      }
      toReveal(card, el, true);
      return cleanupPointerDrag();
    }

    // Drag drop -> discard, but only when the pile is actually visible to the user
    if (pointerDrag.moved) {
      const r = pileArea.getBoundingClientRect();
      const cs = getComputedStyle(pileArea);
      const pileVisible =
        r.width > 0 && r.height > 0 &&
        cs.display !== 'none' && cs.visibility !== 'hidden' &&
        cs.opacity !== '0' && cs.pointerEvents !== 'none';

      const overDiscard =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;

      if (pileVisible && overDiscard && allowDiscard) {
        toDiscard(card, el, true);
        return cleanupPointerDrag();
      }
    }

    cleanupPointerDrag();
  });

  document.addEventListener('pointercancel', cleanupPointerDrag);

  fan.addEventListener('mouseenter', e=>{
    const el = e.target.closest('.fan-card'); if (el && !collapsed) el.classList.add('is-lifted');
  }, true);
  fan.addEventListener('mouseleave', e=>{
    const el = e.target.closest('.fan-card'); if (el) el.classList.remove('is-lifted');
  }, true);
  fan.addEventListener('focusin', e=>{
    const el = e.target.closest('.fan-card'); if (el && !collapsed) el.classList.add('is-lifted');
  });
  fan.addEventListener('focusout', e=>{
    const el = e.target.closest('.fan-card'); if (el) el.classList.remove('is-lifted');
  });

  // Controls
  const disableBtns = x => [collapseB, shuffleB, resetB].forEach(b=>b.disabled = x);

  collapseB.onclick = () => {
    disableBtns(true);
    const goingToCollapse = !collapsed;
    setCollapsed(goingToCollapse);
    const ms = goingToCollapse ? FAN_MS_COLLAPSE() : FAN_MS_EXPAND();
    setTimeout(() => disableBtns(false), ms + 100);
  };

  shuffleB.onclick = () => {
    disableBtns(true);
    const wasCollapsed = collapsed;
    const TRANS_MS = 850 + 35 * 8; // BASE_DUR + STAGGER_MS from gooddeck.html
    const RIFFLE_MS = 300;

    if (!wasCollapsed) {
      setCollapsed(true);
      setTimeout(() => {
        shuffleArr(deck);
        buildFanFast();
        riffle();
        setTimeout(() => {
          setCollapsed(false);
          setTimeout(() => disableBtns(false), TRANS_MS);
        }, RIFFLE_MS + 120);
      }, TRANS_MS);
    } else {
      shuffleArr(deck);
      buildFanFast();
      riffle();
      setTimeout(() => disableBtns(false), RIFFLE_MS + 120);
    }
  };



  // Init
  async function loadDeckMeta(){
    PUBLIC_ID = ATTR.publicId || '';
    if (!ATTR.deckKey) throw new Error('Missing data-deck-key on #deck-loader');

    const url = `${API_DECK}?key=${encodeURIComponent(ATTR.deckKey)}${PUBLIC_ID ? `&public_id=${encodeURIComponent(PUBLIC_ID)}` : ''}`;
    const meta = await fetchWithRetry(url).then(r=>r.json());

    const body = PUBLIC_ID ? {filenames:[meta.cardBack], public_id:PUBLIC_ID} : {filenames:[meta.cardBack]};
    const cb = await fetchWithRetry(API_URLS, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r=>r.json());
    cardBackURL = (cb.images || []).find(i=>i.key === meta.cardBack)?.url || '';
    pileStack.style.backgroundImage = cardBackURL ? `url('${cardBackURL}')` : '';

    await new Promise(res=>{
      const im = new Image();
      im.onload = ()=>{
        document.documentElement.style.setProperty('--card-aspect', im.naturalWidth / im.naturalHeight);
        res();
      };
      im.src = cardBackURL || '';
    });

    deck = meta.cards.map((c,i)=>({
      id: i+1, key: c.frontImageS3Key, url: null, name: c.title || c.name || ''
    }));
  }

  function softReset(){
    deck.push(...discard, ...revealed);
    discard.length = 0; revealed.length = 0;
    
    // Clear the reveal area from remote-reveal.js
    if (window.renderDrawn) {
      window.renderDrawn([]);
    }
    
    shuffleArr(deck);
    buildFanFast(); updateCounts();
    if (collapsed) recalc();
    if (collapsed) deckWrap.classList.add('collapsed-mode');
    else deckWrap.classList.remove('collapsed-mode');
  }

  resetB.onclick = softReset;

  async function init(){
    // Use config values directly
    allowDiscard = config.discardPile;
    allowCollapse = config.deckView === 'fan';
    cardScale = parseFloat(config.cardSize) || 1;
    drawLimit = config.cardCount || 0;

    discard = []; revealed = [];
    
    // Clear the reveal area from remote-reveal.js
    if (window.renderDrawn) {
      window.renderDrawn([]);
    }
    collapsed = false; 
    fan.classList.remove('is-collapsed');
    if (deckWrap) deckWrap.classList.remove('collapsed-mode');
    collapseB.textContent = 'Collapse';

    if (deckLoading) deckLoading.classList.remove('hidden');
    if (deckCount) deckCount.style.display = 'none';
    if (deckInfo)  deckInfo.style.display = 'none';

    await loadDeckMeta();
    shuffleArr(deck);
    buildFanFast();
    idleWarm();

    // apply chosen view + sizes
    syncDiscardSize();

    // For host pages that expect these globals
    if (!Array.isArray(window.drawnCards)) window.drawnCards = [];
    if (typeof window.cardImageMap !== 'object' || !window.cardImageMap) window.cardImageMap = {};
  }

  // Keyboard handling (scoped; act only if focus is within our UI)
  document.addEventListener('keydown', (e)=>{
    const within = container.contains(document.activeElement);
    if (!within) return;

    const active = document.activeElement;
    const isCard = active && active.classList?.contains('fan-card');
    if (e.key === 'c' || e.key === 'C') { collapseB.click(); }
    if (e.key === 's' || e.key === 'S') { shuffleB.click(); }
    if (e.key === 'r' || e.key === 'R') { resetB.click(); }

    if (!isCard) return;

    const row = active.closest('.fan-row');
    const cards = [...row.querySelectorAll('.fan-card')].sort((a,b)=>a.offsetLeft-b.offsetLeft);
    const idx = cards.indexOf(active);
    if (e.key === 'ArrowRight' && idx < cards.length - 1){ e.preventDefault(); cards[idx+1].focus(); }
    if (e.key === 'ArrowLeft'  && idx > 0){ e.preventDefault(); cards[idx-1].focus(); }
    if (e.key === 'Enter'){ e.preventDefault(); const id=+active.dataset.id; const card=deck.find(c=>c.id===id); if (card) toReveal(card, active, true); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && allowDiscard){
      e.preventDefault(); const id=+active.dataset.id; const card=deck.find(c=>c.id===id); if (card) toDiscard(card, active, true);
    }
  });

  window.addEventListener('resize', rafThrottle(() => {
    if (!collapsed && !toggling) buildFanFast();
  }));



  // Go!
  init().catch(err => {
    console.error('OracleFlow shuffler init failed:', err);
    if (deckLoading) deckLoading.querySelector('.deck-loading-text').textContent = 'Error loading deck.';
  });
})();
