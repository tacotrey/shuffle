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
    fanOnly:    truthy(LOADER.getAttribute('data-fan-only')),
  };

  // Create config object from ATTR for compatibility
  const config = {
    publicId: ATTR.publicId,
    deckKey: ATTR.deckKey,
    discardPile: ATTR.discard,
    deckView: ATTR.deckView,
    cardCount: ATTR.drawLimit,
    cardSize: ATTR.cardSize,
    fanOnly: ATTR.fanOnly
  };

  // Debug logging
  console.log('remote-shuffler.js: Config loaded:', config);
  console.log('remote-shuffler.js: deckView mode:', config.deckView);
  console.log('remote-shuffler.js: allowCollapse will be:', config.deckView === 'fan' || config.deckView === 'both');

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
  --riffle-ms: 360ms;
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

/* shuffle feedback */
.shuffle-banner{ display:none; align-items:center; justify-content:center; gap:10px; margin:10px 0 4px 0; }
.shuffle-banner.visible{ display:flex }
.shuffle-dot{ width:8px; height:8px; border-radius:50%; background:#277bfa; animation: sb 1s infinite ease-in-out }
.shuffle-dot:nth-child(2){ animation-delay:.15s }
.shuffle-dot:nth-child(3){ animation-delay:.3s }
@keyframes sb{ 0%,80%,100%{ transform:scale(0.8); opacity:.6 } 40%{ transform:scale(1.2); opacity:1 } }
@layer animations {
  /* Keyframes and animation helpers */
  @keyframes deckShake {
    0%{ transform:translateX(0); }
    20%{ transform:translateX(-2px); }
    40%{ transform:translateX(2px); }
    60%{ transform:translateX(-2px); }
    80%{ transform:translateX(2px); }
    100%{ transform:translateX(0); }
  }
  .deck-shake { animation: deckShake 0.5s ease infinite; }
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
  border: 2px dashed transparent; border-radius: 12px;
  transition: border-color .18s, outline-color .18s;
  overflow: visible; content-visibility: visible; contain: none;
}
/* Match discard hover look: dashed blue with offset */
.fan-tableau.deck-hover{
  border-color: transparent;
  outline: 3px dashed var(--brand-blue);
  outline-offset: 4px;
}
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
  appearance: none; -webkit-appearance: none; padding: 0; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none;
}
.fan-card:focus { outline: none; }
.fan-tableau.is-collapsed .fan-card{
  transform: translate3d(var(--stackX), var(--stackY), 0) rotate(var(--stackR));
  transition: transform var(--fan-ms) var(--fan-ease), box-shadow .18s, filter .18s;
}
.deck-wrapper.collapsed-mode .fan-tableau.is-collapsed .fan-card{
  left: 50%;
  transform: translate3d(calc(-50% + var(--stackX)), var(--stackY), 0) rotate(var(--stackR));
}
.fan-card img{ width:100%; height:100%; object-fit:contain; display:block }
.fan-card.is-lifted{ filter:brightness(1.07) saturate(1.13);
  box-shadow:0 16px 40px 10px rgba(39,123,250,.17);
  transform:translate3d(var(--tx),calc(var(--ty) - 10px),0) rotate(var(--rot)) scale(1.04);
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
  0%  { transform:translate3d(var(--stackX),var(--stackY),0) rotate(calc(var(--stackR) - 3deg)); }
  50% { transform:translate3d(calc(var(--stackX) + 6px),calc(var(--stackY) + 4px),0) rotate(calc(var(--stackR) + 3deg)); }
  100%{ transform:translate3d(var(--stackX),var(--stackY),0) rotate(var(--stackR)); }
}
@keyframes riffleInPlace {
  0%   { transform: translate3d(var(--stackX), var(--stackY), 0) rotate(calc(var(--stackR) - 2deg)) scale(1); }
  35%  { transform: translate3d(calc(var(--stackX) + (var(--i) - var(--mid)) * 0.6px), calc(var(--stackY) - 6px), 0)
                   rotate(calc(var(--stackR) + 2deg)) scale(1.05); }
  65%  { transform: translate3d(var(--stackX), calc(var(--stackY) + 2px), 0) rotate(calc(var(--stackR) - 1deg)) scale(0.985); }
  100% { transform: translate3d(var(--stackX), var(--stackY), 0) rotate(var(--stackR)) scale(1); }
}
.fan-tableau.is-collapsed.is-shuffling .fan-card { animation: riffleInPlace var(--riffle-ms) cubic-bezier(.22,1,.36,1); }
.fan-tableau:not(.is-collapsed).is-shuffling .fan-card { animation: riffle var(--riffle-ms) ease-in-out; }
.fan-tableau:not(.is-collapsed) .fan-card {
  transition:left var(--fan-ms) var(--fan-ease), transform var(--fan-ms) var(--fan-ease), box-shadow .18s, filter .18s;
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
  

/* click pad when collapsed (for easy top-card draw) */
.collapsed-clickpad{
  position:absolute; bottom:0; left:50%; transform:translateX(-50%);
  width:var(--cw); height:calc(var(--cw) / var(--card-aspect));
  border-radius:16px; cursor:pointer; background:transparent;
  pointer-events:none; /* enabled when wrapper has collapsed-mode */
}
.deck-wrapper.collapsed-mode .collapsed-clickpad{ pointer-events:auto }

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
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  background:rgba(255,255,255,.95); padding:20px 30px; border-radius:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.1); z-index:1000; display:flex; align-items:center; gap:12px;
  font-weight:500; color:#1e355d; opacity:0; transition:opacity .3s ease;
  pointer-events: none; /* Don't block interactions */
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
    /* Ensure fan cards can receive touch events */
    .fan-card{ pointer-events: auto; }
`;
    document.head.appendChild(style);
  }

  // ----------------------------- build HTML UI -------------------------------
  const container = document.createElement('div');
  container.className = 'oflow-mount';

  // Build the same structure deck.html uses (minus the inline loader)
  container.innerHTML = `
  <div class="controls" role="group" aria-label="Deck controls">
    <button id="collapseBtn" aria-pressed="false" title="C" style="display: ${config.deckView === 'both' || config.deckView === 'fan' ? 'inline-block' : 'none'};">Collapse</button>
    <button id="shuffleBtn"  title="S">Shuffle</button>
    <button id="resetBtn"    title="R">Reset</button>
    <div class="discard-badge-small" id="discardBadgeSmall" style="display:none;">
      <span id="discardCountSmall">0</span>
    </div>
  </div>

  <div class="deck-wrapper">
    <div class="fan-wrapper">
      <div class="fan-tableau" id="fan-tableau" role="list" aria-label="Deck"></div>
      <div class="collapsed-clickpad" id="collapsedPad" title="Draw top card"></div>
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

  <div class="shuffle-banner" id="shuffleBanner" aria-live="polite">
    <span style="font-weight:600;color:#1e355d" id="shuffleMsg">Shuffling…</span>
    <span class="shuffle-dot"></span><span class="shuffle-dot"></span><span class="shuffle-dot"></span>
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
  const shuffleBanner = $('shuffleBanner');
  const shuffleMsg = $('shuffleMsg');

  /* Mobile/touch detection */
  const IS_COARSE = window.matchMedia('(pointer: coarse)').matches;
  const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

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
    if (has && !IS_TOUCH_DEVICE) pileStack.setAttribute('draggable','true');
    else                          pileStack.removeAttribute('draggable');

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
        // Desktop uses native HTML5 DnD; touch uses custom touch handlers
        c.draggable = !IS_TOUCH_DEVICE;
        c.style.setProperty('--row', r);
        styleCard(c, geom[i], i, slice.length);
        c.innerHTML = `<img alt="back" src="${cardBackURL}" loading="eager" draggable="false">`;
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
      // Calculate the center of the destination relative to the card's current position
      endX = (dRect.left + dRect.width/2) - (sRect.left + sRect.width/2);
      endY = (dRect.top + dRect.height/2) - (sRect.top + sRect.height/2);
    }

    const clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
      position:'absolute', left:sRect.left+'px', top:sRect.top+'px',
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

    let ended = false;
    const done = () => {
      if (ended) return; ended = true;
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
    // Normal path
    clone.addEventListener('transitionend', done, {once:true});
    // Fallback if transitions are disabled (prefers-reduced-motion) or Safari drops the event
    const comp = getComputedStyle(clone);
    const durations = (comp.transitionDuration || '0s').split(',').map(s => s.trim());
    const maxMs = durations.reduce((m, d) => {
      if (!d) return m;
      if (d.endsWith('ms')) return Math.max(m, parseFloat(d)||0);
      if (d.endsWith('s'))  return Math.max(m, (parseFloat(d)||0) * 1000);
      const n = parseFloat(d); return Math.max(m, Number.isFinite(n) ? n*1000 : 0);
    }, 0);
    setTimeout(done, (maxMs || 700) + 60);
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

    if (fly && el) {
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
        // Desktop uses native HTML5 DnD; touch uses custom touch handlers
        c.draggable = !IS_TOUCH_DEVICE;
        c.style.setProperty('--row', r);
        styleCard(c, geom[i], i, slice.length);
        // Always show backs while in the deck; we still prefetch fronts silently
        c.innerHTML = `<img alt="back" src="${cardBackURL}" loading="eager" draggable="false">`;
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

  function setCollapsed(shouldCollapse){
    const collapseMs = FAN_MS_COLLAPSE();
    const expandMs   = FAN_MS_EXPAND();
    toggling = true;

    if (shouldCollapse && !collapsed){
      fan.classList.add('is-collapsing');
      recalc('fan');

      requestAnimationFrame(() => {
        fan.classList.add('is-collapsed');
        collapsed = true;
        collapseB.textContent = 'Fan Out';
        
        // Show discard pile when collapsed (only if discard is enabled)
        if (pileArea && allowDiscard && config.deckView !== 'fan') {
          pileArea.style.display = 'flex';
        }
      });

      setTimeout(() => {
        fan.classList.add('is-freeze');
        deckWrap && deckWrap.classList.add('collapsed-mode');
        applyCollapsedSize();
        recalc('collapsed');
        tidyRows();
        requestAnimationFrame(() => {
          fan.classList.remove('is-freeze');
          fan.classList.remove('is-collapsing');
          toggling = false;
        });
      }, collapseMs + 10);

    } else if (!shouldCollapse && collapsed){
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
        
        // Hide discard pile when fanned out (only if not in 'both' mode)
        if (pileArea && config.deckView === 'fan') {
          pileArea.style.display = 'none';
        }
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
    setTimeout(()=>fan.classList.remove('is-shuffling'), RIFFLE_MS_VAR());
  };
  function showShuffleBanner(ms){
    if (!shuffleBanner) return;
    const msgs = ['Shuffling…','Cutting…','Mixing…'];
    let i = 0; if (shuffleMsg) shuffleMsg.textContent = msgs[0];
    shuffleBanner.classList.add('visible');
    shuffleMsg.classList.add('active');
    const id = setInterval(()=>{ i=(i+1)%msgs.length; if (shuffleMsg) shuffleMsg.textContent = msgs[i]; }, 600);
    setTimeout(()=>{ clearInterval(id); shuffleBanner.classList.remove('visible'); }, ms);
  }
  const shuffleDeck = () => {
    const ms = Math.max(900, RIFFLE_MS_VAR());
    // Add deck shake animation
    fan.classList.add('deck-shake');
    showShuffleBanner(ms + 400);
    shuffleArr(deck);
    buildFanFast();
    setTimeout(()=>{
      fan.classList.remove('deck-shake');
      shuffleMsg.classList.remove('active');
    }, ms);
  };

  // Expose a simple multi-draw utility that uses toReveal
  window.oflowDrawMultiple = async function(n = 1, delayMs = 500){
    const count = Math.max(1, Math.min(n, deck.length));
    for (let k = 0; k < count; k++){
      const card = deck[0]; if (!card) break;
      const el = fan.querySelector(`.fan-card[data-id='${card.id}']`);
      if (el) toReveal(card, el, true);
      await new Promise(r=>setTimeout(r, delayMs));
    }
  };

  // Drag & drop
  function makeDragGhost(w, h, src){
    const g = new Image(); g.src = src;
    Object.assign(g.style, { width: w+'px', height: h+'px', borderRadius:'16px', position:'absolute', top:'-999px', left:'-999px' });
    document.body.appendChild(g);
    return g;
  }

  // Touch-only draggable ghost (follows finger without moving real elements)
  function makeTouchGhost(w, h, src){
    const g = document.createElement('div');
    Object.assign(g.style, {
      position:'fixed', left:'0', top:'0', width:w+'px', height:h+'px',
      background:`url('${src}') center/cover`, borderRadius:'16px',
      boxShadow:'0 12px 28px rgba(39,123,250,.25)', zIndex:10000,
      pointerEvents:'none', transform:'translate(-9999px,-9999px) rotate(5deg)',
      willChange:'transform'
    });
    document.body.appendChild(g);
    return g;
  }

  // Restore HTML5 drag and drop for discard pile functionality (desktop only)
  if (!IS_TOUCH_DEVICE) {
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
  }



  // Old click handler removed - using simple click handler above

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

  // Main deck drag and drop (desktop only)
  if (!IS_TOUCH_DEVICE) {
    fan.addEventListener('dragstart', e => {
      const el = e.target.closest('.fan-card');
      if (!el) return;
      const id = +el.dataset.id;
      const card = deck.find(c => c.id === id);
      if (!card) return;

      e.dataTransfer.setData('text/plain', id);
      const g = makeDragGhost(el.offsetWidth, el.offsetHeight, cardBackURL);
      e.dataTransfer.setDragImage(g, g.offsetWidth/2, g.offsetHeight/2);
      el.style.opacity = '0';
      el._ghost = g;
    });

    fan.addEventListener('dragend', e => {
      const el = e.target.closest('.fan-card');
      if (!el) return;
      if (el.isConnected) el.style.opacity = '1';
      if (el._ghost) {
        el._ghost.remove();
        el._ghost = null;
      }
    });
  }

  // Handle collapsed deck clicks - draw top card without ghost cards
  const collapsedPad = $('collapsedPad');
  if (collapsedPad) {
    collapsedPad.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent bubbling to fan element
      
      if (deck.length === 0) return;
      
      const topCard = deck[0];
      if (!topCard) return;
      
      // Check draw limit
      if (drawLimit > 0 && revealed.length >= drawLimit) {
        // Show limit feedback
        collapsedPad.style.transform = 'scale(0.95)';
        setTimeout(() => {
          collapsedPad.style.transform = '';
        }, 150);
        return;
      }
      
      // Draw the top card directly without creating ghost cards
      toReveal(topCard, null, false); // fly = false to avoid animation issues
    });
  }

  // Touch support for mobile devices (only on touch devices)
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let isDragging = false, draggedElement = null;
  let touchStartElement = null;
  let isTouchDevice = false;
  let suppressClickUntil = 0; // prevent click-to-reveal immediately after a drag

  // Detect touch device - simpler detection to ensure mobile works
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    isTouchDevice = true;
    console.log('Touch device detected:', { 
      ontouchstart: 'ontouchstart' in window, 
      maxTouchPoints: navigator.maxTouchPoints,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth
    });
  } else {
    console.log('Touch device NOT detected');
  }

  // Touch start - track initial position and element (only on touch devices)
  if (isTouchDevice) {
    console.log('Registering touch events on fan element');
    
    // Add a simple touch test to the body to see if touch events work at all
    document.body.addEventListener('touchstart', e => {
      console.log('Body touch start detected:', { touches: e.touches.length });
    }, { passive: true });
    
    fan.addEventListener('touchstart', e => {
      console.log('Touch start detected:', { touches: e.touches.length, target: e.target.className });
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      touchStartElement = e.target.closest('.fan-card');
      console.log('Touch start on card:', { cardId: touchStartElement?.dataset.id, x: touchStartX, y: touchStartY });
      
      // Don't prevent default here - let click events work
    }, { passive: true });

    // Touch move - handle dragging
    fan.addEventListener('touchmove', e => {
      if (!touchStartElement || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      console.log('Touch move:', { distance, isDragging, deltaX, deltaY });
      
      // Start dragging after moving 15px to avoid interfering with clicks
      if (distance > 15 && !isDragging) {
        isDragging = true;
        draggedElement = touchStartElement;
        console.log('Touch drag started:', { cardId: draggedElement.dataset.id, distance });
        
        // Create visual feedback
        draggedElement.style.transform = 'scale(1.1) rotate(5deg)';
        draggedElement.style.zIndex = '1000';
        draggedElement.style.transition = 'none';
        
        // Check if we're over discard area or stack
        const discardAreaRect = pileArea.getBoundingClientRect();
        const discardStackRect = pileStack.getBoundingClientRect();
        
        // Use pageX/pageY for more reliable positioning on mobile
        const touchX = touch.pageX || touch.clientX;
        const touchY = touch.pageY || touch.clientY;
        
        const isOverDiscard = (touchX >= discardAreaRect.left && touchX <= discardAreaRect.right &&
                               touchY >= discardAreaRect.top && touchY <= discardAreaRect.bottom) ||
                              (touchX >= discardStackRect.left && touchX <= discardStackRect.right &&
                               touchY >= discardStackRect.top && touchY <= discardStackRect.bottom);
        
        if (isOverDiscard) {
          pileArea.classList.add('hover');
          // Also add visual feedback to the discard stack
          pileStack.style.transform = 'scale(1.05)';
          pileStack.style.boxShadow = '0 8px 25px rgba(255, 158, 64, 0.3)';
          console.log('Hovering over discard area');
        } else {
          // Remove visual feedback when not hovering
          pileStack.style.transform = '';
          pileStack.style.boxShadow = '';
        }
      }
      
      if (isDragging) {
        e.preventDefault();
        
        // Update visual feedback
        draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1) rotate(5deg)`;
        
        // Check if over discard area or stack
        const discardAreaRect = pileArea.getBoundingClientRect();
        const discardStackRect = pileStack.getBoundingClientRect();
        
        if ((touch.clientX >= discardAreaRect.left && touch.clientX <= discardAreaRect.right &&
             touch.clientY >= discardAreaRect.top && touch.clientY <= discardAreaRect.bottom) ||
            (touch.clientX >= discardStackRect.left && touch.clientX <= discardStackRect.right &&
             touch.clientY >= discardStackRect.top && touch.clientY <= discardStackRect.bottom)) {
          pileArea.classList.add('hover');
        } else {
          pileArea.classList.remove('hover');
        }
      }
    }, { passive: false });

    // Touch end - handle drop
    fan.addEventListener('touchend', e => {
      if (!isDragging || !draggedElement) {
        touchStartElement = null;
        return;
      }
      
      const touch = e.changedTouches[0];
      
      // Check both the discard area and the discard stack for drop detection
      const discardAreaRect = pileArea.getBoundingClientRect();
      const discardStackRect = pileStack.getBoundingClientRect();
      
      // Use pageX/pageY for more reliable positioning on mobile
      const touchX = touch.pageX || touch.clientX;
      const touchY = touch.pageY || touch.clientY;
      
      // Check if dropped on discard area or stack
      const isOverDiscardArea = touchX >= discardAreaRect.left && touchX <= discardAreaRect.right &&
                                touchY >= discardAreaRect.top && touchY <= discardAreaRect.bottom;
      
      const isOverDiscardStack = touchX >= discardStackRect.left && touchX <= discardStackRect.right &&
                                 touchY >= discardStackRect.top && touchY <= discardStackRect.bottom;
      
      console.log('Touch drop coordinates:', { 
        touchX, touchY, 
        clientX: touch.clientX, clientY: touch.clientY,
        pageX: touch.pageX, pageY: touch.pageY,
        discardAreaRect: { left: discardAreaRect.left, right: discardAreaRect.right, top: discardAreaRect.top, bottom: discardAreaRect.bottom },
        discardStackRect: { left: discardStackRect.left, right: discardStackRect.right, top: discardStackRect.top, bottom: discardStackRect.bottom }
      });
      
      if (isOverDiscardArea || isOverDiscardStack) {
        // Drop the card
        const id = +draggedElement.dataset.id;
        const card = deck.find(c => c.id === id);
        console.log('Touch drop detected:', { id, card, allowDiscard, isOverDiscardArea, isOverDiscardStack });
        if (card && allowDiscard) {
          console.log('Calling toDiscard...');
          // Clear touch drag styles before calling toDiscard to prevent animation conflicts
          draggedElement.style.transform = '';
          draggedElement.style.zIndex = '';
          draggedElement.style.transition = '';
          toDiscard(card, draggedElement, true);
        }
      } else {
        // Fallback: if we dragged far enough and are vaguely in the right area, still allow drop
        const dragDistance = Math.sqrt((touchX - touchStartX) ** 2 + (touchY - touchStartY) ** 2);
        const isRightSide = touchX > window.innerWidth * 0.6; // Right side of screen
        const isLowerHalf = touchY > window.innerHeight * 0.5; // Lower half of screen
        
        if (dragDistance > 50 && isRightSide && isLowerHalf) {
          console.log('Fallback drop detected - dragging to right side');
          const id = +draggedElement.dataset.id;
          const card = deck.find(c => c.id === id);
          if (card && allowDiscard) {
            console.log('Fallback: Calling toDiscard...');
            draggedElement.style.transform = '';
            draggedElement.style.zIndex = '';
            draggedElement.style.transition = '';
            toDiscard(card, draggedElement, true);
          }
        } else {
          console.log('Touch drop NOT over discard area and fallback conditions not met');
        }
      }
      
      // Reset visual state (only if we didn't call toDiscard)
      if (!isOverDiscardArea && !isOverDiscardStack) {
        draggedElement.style.transform = '';
        draggedElement.style.zIndex = '';
        draggedElement.style.transition = '';
      }
      pileArea.classList.remove('hover');
      pileStack.style.transform = '';
      pileStack.style.boxShadow = '';
      
      // Prevent synthetic click right after a drag
      suppressClickUntil = Date.now() + 400;

      // Reset state
      isDragging = false;
      draggedElement = null;
      touchStartElement = null;
    });

    // Touch cancel - reset state
    fan.addEventListener('touchcancel', () => {
      if (draggedElement) {
        draggedElement.style.transform = '';
        draggedElement.style.zIndex = '';
        draggedElement.style.transition = '';
      }
      pileArea.classList.remove('hover');
      pileStack.style.transform = '';
      pileStack.style.boxShadow = '';
      isDragging = false;
      draggedElement = null;
      touchStartElement = null;
    });
  }

  // Touch support for discard pile (drag back to deck) - only on touch devices
  if (isTouchDevice) {
    let discardTouchStartX = 0, discardTouchStartY = 0;
    let isDiscardDragging = false, discardDraggedElement = null;
    let discardGhost = null;

    pileStack.addEventListener('touchstart', e => {
      if (!allowDiscard || !discard.length || e.touches.length !== 1) return;
      const touch = e.touches[0];
      discardTouchStartX = touch.clientX;
      discardTouchStartY = touch.clientY;
      discardDraggedElement = pileStack;
      // Don't prevent default - let other touch events work
    }, { passive: true });

    pileStack.addEventListener('touchmove', e => {
      if (!discardDraggedElement || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - discardTouchStartX;
      const deltaY = touch.clientY - discardTouchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 15 && !isDiscardDragging) {
        isDiscardDragging = true;
        pileStack.style.transform = 'scale(1.1)';
        pileStack.style.zIndex = '1000';
        // Create a visual ghost that follows the finger
        const gW = pileStack.offsetWidth;
        const gH = pileStack.offsetHeight;
        discardGhost = makeTouchGhost(gW, gH, cardBackURL || '');
        // position once on start
        const centerX = touch.pageX || touch.clientX;
        const centerY = touch.pageY || touch.clientY;
        discardGhost.style.transform = `translate(${centerX - gW/2}px, ${centerY - gH/2}px) rotate(5deg)`;
        
        // Check if over deck area
        const deckRect = fan.getBoundingClientRect();
        if (touch.clientX >= deckRect.left && touch.clientX <= deckRect.right &&
            touch.clientY >= deckRect.top && touch.clientY <= deckRect.bottom) {
          fan.classList.add('deck-hover');
        }
      }
      
      if (isDiscardDragging) {
        e.preventDefault();
        // Keep the pile visually in place; only scale for feedback
        pileStack.style.transform = 'scale(1.1)';
        // Update ghost position to follow touch
        if (discardGhost){
          const gW = discardGhost.offsetWidth, gH = discardGhost.offsetHeight;
          const x = touch.pageX || touch.clientX;
          const y = touch.pageY || touch.clientY;
          discardGhost.style.transform = `translate(${x - gW/2}px, ${y - gH/2}px) rotate(5deg)`;
        }

        // Check if over deck area
        const deckRect = fan.getBoundingClientRect();
        if (touch.clientX >= deckRect.left && touch.clientX <= deckRect.right &&
            touch.clientY >= deckRect.top && touch.clientY <= deckRect.bottom) {
          fan.classList.add('deck-hover');
        } else {
          fan.classList.remove('deck-hover');
        }
      }
    }, { passive: false });

    pileStack.addEventListener('touchend', e => {
      if (!isDiscardDragging || !discardDraggedElement) return;
      
      const touch = e.changedTouches[0];
      const deckRect = fan.getBoundingClientRect();
      
      // Check if dropped on deck area
      if (touch.clientX >= deckRect.left && touch.clientX <= deckRect.right &&
          touch.clientY >= deckRect.top && touch.clientY <= deckRect.bottom) {
        
        // Restore the discard pile
        restorePile();
      }
      
      // Reset visual state
      pileStack.style.transform = '';
      pileStack.style.zIndex = '';
      fan.classList.remove('deck-hover');
      if (discardGhost){ discardGhost.remove(); discardGhost = null; }
      
      // Prevent synthetic click right after a drag
      suppressClickUntil = Date.now() + 400;

      // Reset state
      isDiscardDragging = false;
      discardDraggedElement = null;
    });

    pileStack.addEventListener('touchcancel', () => {
      if (discardDraggedElement) {
        pileStack.style.transform = '';
        pileStack.style.zIndex = '';
      }
      fan.classList.remove('deck-hover');
      if (discardGhost){ discardGhost.remove(); discardGhost = null; }
      isDiscardDragging = false;
      discardDraggedElement = null;
    });
  }

  // Pointer events system removed - using simple HTML5 drag and drop

  // Simple click handling (from deck copy.html)
  fan.addEventListener('click', e => {
    if (IS_TOUCH_DEVICE && Date.now() < suppressClickUntil) {
      // Swallow the click that follows a touch-drag
      return;
    }
    const el = e.target.closest('.fan-card');
    if (!el) return;
    const id = +el.dataset.id;
    const card = deck.find(c => c.id === id);
    if (!card) return;

    // Check draw limit first before doing any loading
    if (drawLimit > 0 && revealed.length >= drawLimit) {
      // Show visual feedback and return early
      el.classList.add('limit-feedback');
      setTimeout(() => {
        el.classList.remove('limit-feedback');
      }, 150);
      return;
    }

    // If card doesn't have front image loaded, prioritize it
    if (!card.url) {
      // Move this card to highest priority in loading queue
      loadingQueue.unshift({ card, priority: true });
      processLoadingQueue();
      
      // Show loading indicator
      loadingIndicator.classList.add('visible');
      loadingIndicator.querySelector('span').textContent = 'Loading card...';
    }
    toReveal(card, el, true);
  });

  // Pointer events now only handle clicks, not drags
  // Drags are handled by HTML5 drag and drop system

  // Pointer events system removed - using simple HTML5 drag and drop

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

  // Collapse button: just collapse/expand the deck without shuffling
  collapseB.onclick = () => {
    disableBtns(true);
    const goingToCollapse = !collapsed;
    setCollapsed(goingToCollapse);
    const ms = goingToCollapse ? FAN_MS_COLLAPSE() : FAN_MS_EXPAND();

    // Re-enable buttons after animation completes
    setTimeout(() => {
      disableBtns(false);
    }, ms + 100);
  };

  // Shuffle button: collapse (if needed) then run unified shuffle; optionally expand back
  shuffleB.onclick = () => {
    disableBtns(true);
    const wasCollapsed = collapsed;
    const wasDiscardVisible = pileArea && pileArea.style.display !== 'none';
    const COLLAPSE_MS = FAN_MS_COLLAPSE();
    const EXPAND_MS   = FAN_MS_EXPAND();

    const runUnifiedShuffle = () => {
      // unified shuffle (banner + shake + Fisher–Yates + rebuild + riffle)
      shuffleDeck();

      // After the shuffle window, optionally expand back to fan view
      const MS = Math.max(900, RIFFLE_MS_VAR()) + 420; // match shuffleDeck timing + banner grace
      setTimeout(() => {
        if (!wasCollapsed) {
          setCollapsed(false);
          // Restore prior discard visibility
          if (pileArea) pileArea.style.display = wasDiscardVisible ? 'flex' : 'none';
          // Re-enable after expand completes
          setTimeout(() => disableBtns(false), EXPAND_MS + 20);
        } else {
          // Already collapsed: re-enable right away after shuffle window
          disableBtns(false);
        }
      }, MS);
    };

    if (!wasCollapsed) {
      // Ensure deck is collapsed before shuffling so riffle-in-place runs
      setCollapsed(true);
      setTimeout(runUnifiedShuffle, COLLAPSE_MS + 20);
    } else {
      runUnifiedShuffle();
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
    allowCollapse = config.deckView === 'fan' || config.deckView === 'both';
    cardScale = parseFloat(config.cardSize) || 1;
    drawLimit = config.cardCount || 0;
    
    // Show discard area if discard is enabled and not in fan-only mode
    if (pileArea) {
      const shouldShowDiscard = allowDiscard && (config.deckView === 'both' || config.deckView === 'collapsed');
      pileArea.style.display = shouldShowDiscard ? 'flex' : 'none';
    }

    discard = []; revealed = [];
    
    // Clear the reveal area from remote-reveal.js
    if (window.renderDrawn) {
      window.renderDrawn([]);
    }
    // Start in collapsed mode if deckView is 'collapsed'
    collapsed = config.deckView === 'collapsed';
    if (collapsed) {
      fan.classList.add('is-collapsed');
      if (deckWrap) deckWrap.classList.add('collapsed-mode');
      collapseB.textContent = 'Fan Out';
    } else {
      fan.classList.remove('is-collapsed');
      if (deckWrap) deckWrap.classList.remove('collapsed-mode');
      collapseB.textContent = 'Collapse';
    }

    if (deckLoading) deckLoading.classList.remove('hidden');
    if (deckCount) deckCount.style.display = 'none';
    if (deckInfo)  deckInfo.style.display = 'none';

    await loadDeckMeta();
    if (collapsed) {
      // Deck starts collapsed: run the unified shuffle for full UX (banner + shake + riffle-in-place)
      shuffleDeck();
    } else {
      // Non-collapsed: keep the fast build path
      shuffleArr(deck);
      buildFanFast();
    }
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



  // Global cleanup function to remove any stray ghost cards
  function cleanupAllGhosts() {
    // Clean up HTML5 drag ghosts
    const cards = fan.querySelectorAll('.fan-card');
    cards.forEach(card => {
      if (card._ghost) {
        card._ghost.remove();
        card._ghost = null;
      }
    });
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', cleanupAllGhosts);
  window.addEventListener('pagehide', cleanupAllGhosts);

  // Go!
  init().catch(err => {
    console.error('OracleFlow shuffler init failed:', err);
    if (deckLoading) deckLoading.querySelector('.deck-loading-text').textContent = 'Error loading deck.';
    cleanupAllGhosts();
  });
})();
