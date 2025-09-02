!function(){
  var e=document.currentScript;
  
  // Get configuration from the script tag
  var config = {
    publicId: e.getAttribute('data-public-id') || '',
    deckKey: e.getAttribute('data-deck-key') || '',
    discardPile: e.getAttribute('data-discard-pile') === '1',
    deckView: e.getAttribute('data-deck-view') || '2', // 1=collapsed, 2=both, 3=fan
    cardCount: parseInt(e.getAttribute('data-card-count')) || 3,
    cardSize: e.getAttribute('data-card-size') || 'medium'
  };
  
  // Create the deck container if it doesn't exist
  if(!document.getElementById("deckContainer")){
    var container = document.createElement("div");
    container.id = "deckContainer";
    container.style = "margin: 20px 0; text-align: center;";
    e.parentNode.insertBefore(container, e.nextSibling);
  }
  
  // Add CSS if not already present
  if(!document.getElementById("deck-shuffler-css")){
    var style = document.createElement("style");
    style.id = "deck-shuffler-css";
    style.innerHTML = "\n      :root{\n        --brand-blue:#277bfa; --brand-green:#1e9b6e;\n        --brand-orange:#ff9e40; --brand-purple:#7748e0;\n        --card-aspect:13/20;  --stagger-step:35ms; --stagger-cap:8;\n        --fan-ms: 1.55s;\n        --riffle-ms: 560ms;\n        --fan-ease: cubic-bezier(.25,.8,.35,1);\n      }\n      /* base / layout */\n      * { box-sizing:border-box }\n      .config-bar,.controls{\n        margin:14px 0 0; display:flex; flex-wrap:wrap;\n        align-items:center; justify-content:center; gap:.8em;\n        font-size:1.05rem;\n      }\n      .config-bar label,.controls label{font-weight:500;color:#224}\n      select{\n        padding:4px 10px; min-width:56px; font-size:1rem;\n        border:1.5px solid #b9c7e0; border-radius:7px; background:#f7faff;\n        transition:border-color .18s;\n      }\n      select:focus{ outline:none; border-color:var(--brand-blue) }\n      button{\n        padding:7px 22px; font-size:1rem; font-weight:500; color:#fff;\n        border:0; border-radius:8px; cursor:pointer;\n        box-shadow:0 2px 10px 0 #bed3fa22; transition:background .2s, opacity .2s;\n      }\n      #collapseBtn{background:var(--brand-blue)}\n      #shuffleBtn {background:var(--brand-green)}\n      #resetBtn  {background:var(--brand-orange)}\n      button:disabled{background:#b8b9c8; cursor:not-allowed; opacity:.6}\n      /* ---- deck / pile columns ----------------------------------------- */\n      .deck-wrapper{\n        display: flex;\n        align-items: flex-start;\n        justify-content: center;\n        gap: 48px;\n        width: 100%;\n        max-width: none;\n        padding-inline: 0;\n        min-height: 280px;\n        padding-top: clamp(12px, 5vh, 60px);\n        position: relative;\n      }\n      .fan-wrapper{\n        flex: 0 1 auto;\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        gap: 6px;\n        min-width: 0;\n        height: auto;                 /* let content define height */\n        min-height: 280px;            /* floor for small sizes */\n        justify-content: flex-end;\n        padding-bottom: 20px;\n      }\n      .discard-area{\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        gap: 6px;\n        cursor: pointer;\n        user-select: none;\n        margin-top: 18px;\n        opacity: 0;\n        transform: translateX(20px);\n        transition: opacity 0.15s ease, transform 0.15s ease;\n        pointer-events: none;\n        position: absolute;\n        left: 50%;\n        top: 0;\n        z-index: 10;\n        width: 130px;\n      }\n      .deck-info,.discard-info{\n        margin-top: 24px;\n        font: 600 1.1rem system-ui,sans-serif;\n        color: #1e355d;\n        text-align: center;\n        height: 20px; /* Fixed height for consistent alignment */\n        display: flex;\n        align-items: center;\n        justify-content: center;\n      }\n      /* ---- fan tableau -------------------------------------------------- */\n      .fan-tableau{\n        width: 99vw;\n        max-width: 900px;\n        margin-top: 0;\n        position: relative;\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        border: 2px dashed transparent;\n        border-radius: 12px;\n        transition: border-color .18s;\n        overflow: visible;\n        content-visibility: visible;\n        contain: none;\n      }\n      .fan-tableau.deck-hover{ border-color:var(--brand-blue) }\n      .fan-row{\n        position: relative;\n        width: 100%;\n        height: calc(var(--cw) / var(--card-aspect));  /* exact card height */\n        max-height: none;\n        min-height: 0;\n        margin-top: 0;                                   /* JS sets overlap */\n        pointer-events: none;\n        content-visibility: visible;\n      }\n      .fan-row:first-child{ margin-top: 0 }\n      /* ---- cards -------------------------------------------------------- */\n      .fan-card{\n        --tx:0; --ty:0; --rot:0deg; --stackX:0; --stackY:0; --stackR:0deg; --row:0;\n        position: absolute;\n        top: auto;\n        bottom: 0;\n        left: 0;\n        width: var(--cw);\n        aspect-ratio: var(--card-aspect);\n        min-width: 55px;\n        max-width: 130px;\n        border-radius: 16px;\n        overflow: hidden;\n        border: none;\n        cursor: pointer;\n        user-select: none;\n        pointer-events: auto;\n        background: transparent;\n        transition:\n          left var(--fan-ms) var(--fan-ease),\n          transform var(--fan-ms) var(--fan-ease),\n          box-shadow .18s, filter .18s;\n        /* tiny per-card stagger for extra \"flow\" */\n        transition-delay:\n          calc(min(var(--row), var(--stagger-cap)) * var(--stagger-step)\n               + var(--i-del, 0) * 14ms);\n        transform: translate(var(--tx),var(--ty)) rotate(var(--rot));\n        transform-origin: 50% 100%; /* consistent pivot point */\n        box-shadow: 0 4px 16px 2px rgba(60,70,120,.16);\n        will-change: transform,left;\n        appearance: none;\n        -webkit-appearance: none;\n        padding: 0;\n        -webkit-tap-highlight-color: transparent;\n      }\n      .fan-card:focus { outline: none; }\n      .fan-tableau.is-collapsed .fan-card{\n        transform:translate(var(--stackX),var(--stackY)) rotate(var(--stackR));\n        box-shadow:0 2px 8px rgba(0,0,0,.12);\n      }\n      .fan-card img{ width:100%; height:100%; object-fit:contain; display:block }\n      .fan-card.is-lifted{\n        filter:brightness(1.07) saturate(1.13);\n        box-shadow:0 16px 40px 10px rgba(39,123,250,.17);\n        transform:translate(var(--tx),calc(var(--ty) - 10px)) rotate(var(--rot)) scale(1.04);\n      }\n      .fan-card:focus-visible{ outline:3px solid var(--brand-blue); outline-offset:2px }\n      /* When the deck is collapsed or shuffling, don't animate `left` — only `transform`. */\n      .fan-tableau.is-collapsed .fan-card,\n      .fan-tableau.is-collapsed.is-shuffling .fan-card {\n        transition:\n          transform var(--fan-ms) var(--fan-ease),\n          box-shadow .18s,\n          filter .18s;              /* left transition removed */\n      }\n      /* shuffle riffle */\n      @keyframes riffle{\n        0%  { transform:translate(var(--stackX),var(--stackY)) rotate(calc(var(--stackR) - 3deg)); }\n        50% { transform:translate(calc(var(--stackX) + 6px),calc(var(--stackY) + 4px)) rotate(calc(var(--stackR) + 3deg)); }\n        100%{ transform:translate(var(--stackX),var(--stackY)) rotate(var(--stackR)); }\n      }\n      /* A riffle that pulses in place from the collapsed center */\n      @keyframes riffleInPlace {\n        0%   { transform: translate(var(--stackX), var(--stackY))\n                       rotate(calc(var(--stackR) - 2deg)) scale(1); }\n        35%  { transform: translate(calc(var(--stackX) + (var(--i) - var(--mid)) * 0.6px),\n                                calc(var(--stackY) - 6px))\n                       rotate(calc(var(--stackR) + 2deg)) scale(1.05); }\n        65%  { transform: translate(var(--stackX), calc(var(--stackY) + 2px))\n                       rotate(calc(var(--stackR) - 1deg)) scale(0.985); }\n        100% { transform: translate(var(--stackX), var(--stackY))\n                       rotate(var(--stackR)) scale(1); }\n      }\n      /* Use the in-place riffle only when collapsed */\n      .fan-tableau.is-collapsed.is-shuffling .fan-card {\n        animation: riffleInPlace var(--riffle-ms) cubic-bezier(.22,1,.36,1);\n      }\n      /* Keep the old riffle for the fanned view */\n      .fan-tableau:not(.is-collapsed).is-shuffling .fan-card {\n        animation: riffle var(--riffle-ms) ease-in-out;\n      }\n      /* When fanning out after a shuffle, ensure cards start from center */\n      .fan-tableau:not(.is-collapsed) .fan-card {\n        transition:\n          left var(--fan-ms) var(--fan-ease),\n          transform var(--fan-ms) var(--fan-ease),\n          box-shadow .18s, filter .18s;\n      }\n      /* ---- discard pile ------------------------------------------------- */\n      .discard-area{\n        display:flex; flex-direction:column; align-items:center; gap:6px;\n        cursor:pointer; user-select:none; margin-top:18px;\n        opacity: 0;\n        transform: translateX(20px);\n        transition: opacity 0.15s ease, transform 0.15s ease;\n        pointer-events: none;\n        position: absolute;\n        left: 50%;\n        top: 0;\n        z-index: 10;\n        width: 130px; /* Match the collapsed deck width */\n      }\n      /* Show discard pile only when deck is collapsed */\n      .fan-tableau.is-collapsed ~ .discard-area,\n      .deck-wrapper.collapsed-mode .discard-area {\n        opacity: 1;\n        transform: none;\n        pointer-events: auto;\n        position: static;\n        left: auto;\n      }\n      .discard-stack{\n        width:130px; aspect-ratio:var(--card-aspect); border-radius:16px;\n        background:#d8d8d8 center/cover; box-shadow:0 6px 16px rgba(0,0,0,.25);\n        opacity:.25; transition:transform .25s, opacity .25s, outline-offset .2s;\n      }\n      .discard-area.has-cards .discard-stack{ opacity:1 }\n      .discard-area.hover .discard-stack{ outline:3px dashed var(--brand-blue); outline-offset:4px }\n      .discard-badge, .deck-badge{\n        padding:2px 10px; border-radius:14px; background:#1e355d; color:#fff;\n        font-weight:600; font-size:.9rem; min-width:36px; text-align:center;\n        transform:scale(0); transition:transform .25s;\n      }\n      .discard-area.has-cards .discard-badge{ transform:scale(1) }\n      .deck-badge{ transform:scale(1) }\n      /* ---- Modal Styles ------------------------------------------------- */\n      .modal { \n        display:none; \n        position:fixed; \n        z-index:9999; \n        left:0; \n        top:0; \n        width:100%; \n        height:100%; \n        overflow:auto; \n        background-color:rgba(0,0,0,0.8); \n      }\n      .modal-content {\n        margin:auto; \n        display:block; \n        max-width:90%; \n        max-height:90%; \n        box-shadow:0 2px 10px rgba(0,0,0,0.5); \n        border-radius:8px; \n        transition:transform 0.6s;\n      }\n      .modalClose {\n        position:absolute; \n        top:10px; \n        right:10px; \n        color:#fff; \n        font-size:35px; \n        font-weight:bold; \n        cursor:pointer; \n        z-index:10001;\n      }\n      .modal-caption {\n        color:#ccc; \n        text-align:center; \n        margin-top:10px; \n        font-size:18px; \n        font-weight:500;\n      }\n      .modal-nav {\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        gap: 10px;\n        margin-top: 10px;\n      }\n      .modal-nav-btn {\n        background-color: #228b22; \n        color: #fff; \n        border: none; \n        border-radius: 5px; \n        font-size: 16px; \n        padding: 8px 16px; \n        cursor: pointer; \n        opacity: 1;\n      }\n      .modal-nav-btn:hover { opacity:0.9; }\n      .modal-nav-btn:disabled { \n        cursor:not-allowed; \n        background-color:#aaa; \n        opacity:0.7; \n      }\n      /* The wrapper in \"no-details\" state => single column, centered */\n      .modal-content-wrapper {\n        display: flex;\n        flex-direction: column;\n        justify-content: center;\n        align-items: center;\n        max-height: 80vh;\n        overflow: auto;\n        transition: all 0.4s ease;\n      }\n      /* The <img> can be 350px wide when details are hidden */\n      .modal-image img {\n        max-width: 350px;\n        height: auto;\n        border-radius: 8px;\n        box-shadow: 0 2px 8px rgba(0,0,0,0.5);\n      }\n      .modal-image-large img {\n        max-width: 500px;\n        max-height: calc(100vh - 150px);\n        object-fit: contain;\n      }\n      /* WHEN DETAILS ARE SHOWN:\n         We toggle a .show-details class on the wrapper => become side-by-side */\n      .modal-content-wrapper.show-details {\n        flex-direction: row;\n        align-items: flex-start;\n        gap: 20px;\n      }\n      /* If you want the card smaller or the same 350px, that's your call:\n         In a side-by-side layout, keep or reduce its max-width. */\n      .modal-content-wrapper.show-details .modal-image img {\n        max-width: 350px;\n      }\n      /* The details container can fill remaining space if you want: */\n      .modal-details {\n        flex: 1;\n        max-height: 80vh;\n        overflow-y: auto;\n        background: #fff;\n        border-radius: 8px;\n        padding: 10px;\n        box-shadow: 0 2px 8px rgba(0,0,0,0.2);\n      }\n      /* On narrower screens, you can revert to stacking with a media query: */\n      @media (max-width: 768px) {\n        /* Use column layout when showing details, so card + details stack */\n        .modal-content-wrapper.show-details {\n          flex-direction: column;\n          align-items: center;\n        }\n        /* If you want the nav above the details, do: */\n        .modal-nav {\n          order: 2;\n        }\n        .modal-details {\n          order: 3; \n          overflow-y: auto;\n          width: 100%;\n          margin-top: 1rem; \n        }\n        /* BIG card when details are NOT shown */\n        .modal-content-wrapper:not(.show-details) .modal-image img {\n          max-width: 90vw;\n          max-height: 80vh;\n          height: auto;\n        }\n        /* SMALLER card when details are shown */\n        .modal-content-wrapper.show-details .modal-image img {\n          max-width: 40vw;\n          max-height: 40vh;\n          height: auto;\n        }\n      }\n      /* ---- loading indicator ------------------------------------------- */\n      .loading-indicator {\n        position: fixed;\n        top: 50%;\n        left: 50%;\n        transform: translate(-50%, -50%);\n        background: rgba(255, 255, 255, 0.95);\n        padding: 20px 30px;\n        border-radius: 12px;\n        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);\n        z-index: 1000;\n        display: flex;\n        align-items: center;\n        gap: 12px;\n        font-weight: 500;\n        color: #1e355d;\n        opacity: 0;\n        transition: opacity 0.3s ease;\n      }\n      .loading-indicator.visible {\n        opacity: 1;\n      }\n      .loading-spinner {\n        width: 20px;\n        height: 20px;\n        border: 2px solid #e0e7ff;\n        border-top: 2px solid var(--brand-blue);\n        border-radius: 50%;\n        animation: spin 1s linear infinite;\n      }\n      @keyframes spin {\n        0% { transform: rotate(0deg); }\n        100% { transform: rotate(360deg); }\n      }\n      /* ---- small discard badge ----------------------------------------- */\n      .discard-badge-small {\n        position: absolute;\n        top: -8px;\n        right: -8px;\n        background: var(--brand-orange);\n        color: white;\n        border-radius: 50%;\n        width: 20px;\n        height: 20px;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        font-size: 12px;\n        font-weight: bold;\n        box-shadow: 0 2px 4px rgba(0,0,0,0.2);\n        animation: fadeIn 0.3s ease;\n      }\n      @keyframes fadeIn {\n        from { opacity: 0; transform: scale(0.8); }\n        to { opacity: 1; transform: scale(1); }\n      }\n      /* Position the badge relative to the collapse button */\n      #collapseBtn {\n        position: relative;\n      }\n      /* ---- motion preferences ------------------------------------------ */\n      @media (prefers-reduced-motion: reduce){\n        .fan-card{ transition:none !important; animation:none !important }\n      }\n      /* ---- mobile tweaks ----------------------------------------------- */\n      @media(max-width:650px){\n        .fan-card, .discard-stack{ min-width:35px; }\n        .card-wrapper{ width:80px }\n      }\n      @media(max-width:480px){\n        .fan-card, .discard-stack{ min-width:28px; }\n        .card-wrapper{ width:60px }\n      }\n      /* ---- reveal strip ------------------------------------------------- */\n      .selected-area{
        margin:32px auto 40px; width:100%; max-width:1100px; min-height:120px;
        display:flex; flex-wrap:wrap; justify-content:center; gap:16px;
        border:2px dashed transparent; border-radius:12px; transition:border-color .18s;
      }
      .selected-area.drop-hover{ border-color:var(--brand-blue) }
      .selected-card{ 
        display:flex; flex-direction:column; align-items:center;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .selected-card:hover {
        transform: scale(1.05);
      }
      .label{ margin-top:6px; font-weight:600; color:#1e355d }
      /* ---- flip faces --------------------------------------------------- */
      .card-wrapper{
        width:130px; aspect-ratio:var(--card-aspect); border-radius:16px;
        perspective:1200px; overflow:hidden;
      }
      .card-inner{
        position:relative; width:100%; height:100%;
        transform-style:preserve-3d;
        transition:transform 1s cubic-bezier(.26,.6,.23,1);
        will-change:transform;
      }
      .card-wrapper.flipped .card-inner{ transform:rotateY(180deg) }
      .card-face{
        position:absolute; inset:0; backface-visibility:hidden; border-radius:inherit;
      }
      .card-front{ transform:rotateY(180deg) }
      .card-back { transform:none }
      .card-face img{ width:100%; height:100%; object-fit:contain; display:block }
    ";
    document.head.appendChild(style);
  }
  
  // API endpoints
  var API_DECK = "https://yrc76i5e6e.execute-api.us-east-2.amazonaws.com/api/cards";
  var API_URLS = "https://yrc76i5e6e.execute-api.us-east-2.amazonaws.com/api/card-urls";
  var PER_ROW = 100;
  var RIFFLE_MS = 800;
  var FLIP_DELAY = 400;
  
  // utilities to read CSS variables
  function readMSVar(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    if (raw.endsWith('ms')) return parseFloat(raw);
    if (raw.endsWith('s'))  return parseFloat(raw) * 1000;
    var n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  
  function FAN_MS() { return readMSVar('--fan-ms', 1100); }
  function RIFFLE_MS_VAR() { return readMSVar('--riffle-ms', 560); }
  
  // State variables
  var deck = [];
  var discard = [];
  var revealed = [];
  var cardBackURL = "";
  var collapsed = false;
  var allowDiscard = config.discardPile;
  var allowCollapse = config.deckView === '2';
  var cardScale = 1;
  var deckHover = 0;
  var currentModalIndex = 0;
  var detailsVisible = false;
  var imageCache = {};
  var loadingQueue = [];
  var isLoading = false;
  
  // DOM elements
  var container = document.getElementById("deckContainer");
  
  // Create the HTML structure - EXACTLY like deck.html
  function createDeckHTML() {
    container.innerHTML = '\n      <div class="config-bar" role="group" aria-label="Deck options">\n        <label><input type="checkbox" id="enableDiscard" ' + (allowDiscard ? 'checked' : '') + ' /> Discard Pile</label>\n        <label for="cardSize">Card Size:</label>\n        <select id="cardSize" aria-label="Card size">\n          <option value="0.85">Small</option>\n          <option value="1" selected>Medium</option>\n          <option value="1.2">Large</option>\n          <option value="1.4">XL</option>\n        </select>\n      </div>\n      <div class="controls" role="group" aria-label="Deck controls">\n        <button id="collapseBtn" aria-pressed="false" title="C" style="display: ' + (allowCollapse ? 'inline-block' : 'none') + ';">Collapse</button>\n        <button id="shuffleBtn" title="S">Shuffle</button>\n        <button id="resetBtn" title="R">Reset</button>\n        <div class="discard-badge-small" id="discardBadgeSmall" style="display: none;">\n          <span id="discardCountSmall">0</span>\n        </div>\n      </div>\n      <div class="deck-wrapper">\n        <div class="fan-wrapper">\n          <div class="fan-tableau" id="fan-tableau" role="list" aria-label="Deck"></div>\n          <div class="deck-badge" id="deckCount" aria-live="polite" style="display: none;">0</div>\n          <div class="deck-info" id="deckInfo" style="display:none;">Deck</div>\n        </div>\n        <div class="discard-area" id="discardArea" aria-label="Discard pile" tabindex="0" style="display: ' + (allowDiscard ? 'flex' : 'none') + ';">\n          <div class="discard-stack" id="discardStack"></div>\n          <div class="discard-badge" id="discardCount" aria-live="polite">0</div>\n          <div class="discard-info">Discard</div>\n        </div>\n      </div>\n      <div class="selected-area" id="selectedArea" aria-label="Revealed cards"></div>\n      <!-- Modal for Full Screen Card View -->\n      <div id="cardImageModal" class="modal">\n        <span class="modalClose" id="modalClose">&times;</span>\n        <div class="modal-content-wrapper" id="modalContentWrapper">\n          <div class="modal-image">\n            <img id="modalImg" />\n          </div>\n          <div class="modal-details" id="modalDetailsSide" style="display:none;"></div>\n        </div>\n        <div id="modalCaption" class="modal-caption"></div>\n        <div class="modal-nav" id="modalNav">\n          <button id="modalPrev" class="modal-nav-btn">Previous</button>\n          <button id="modalNext" class="modal-nav-btn">Next</button>\n          <button id="modalToggleDetails" class="modal-nav-btn" style="display:none;">Show Details</button>\n          <button id="modalOrientationBtn" class="modal-nav-btn" style="display:none;">View Upright</button>\n        </div>\n      </div>\n      <!-- Loading indicator -->\n      <div class="loading-indicator" id="loadingIndicator">\n        <div class="loading-spinner"></div>\n        <span>Loading cards...</span>\n      </div>\n    ';
  }
  
  // Image loading functions
  async function getCardImageURL(key) {
    if (imageCache[key]) return imageCache[key];
    var body = config.publicId ? {filenames:[key], public_id:config.publicId} : {filenames:[key]};
    console.log('Requesting card URL for:', key, 'with body:', body);
    var resp = await fetchWithRetry(API_URLS, {
      method:'POST', 
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
    console.log('Card URL response:', resp);
    var url = (resp.images || []).find(function(i) { return i.key === key; })?.url;
    if (url) imageCache[key] = url;
    return url;
  }
  
  async function ensureFront(card, options) {
    options = options || {};
    if (card.url) return card.url;
    var url = await getCardImageURL(card.key);
    if (!url) return null;
    
    // Priority decode path—block flip until GPU-decoded
    if (options.priority) {
      var im = new Image();
      im.src = url;
      try { if (im.decode) await im.decode(); } catch(e) {}
    } else {
      // Background warm-up (no await)
      var im = new Image();
      im.loading = 'eager';
      im.src = url;
    }
    
    card.url = url;
    return url;
  }
  
  // Progressive loading queue
  async function processLoadingQueue() {
    if (isLoading || loadingQueue.length === 0) return;
    isLoading = true;
    
    while (loadingQueue.length > 0) {
      var item = loadingQueue.shift();
      var card = item.card;
      var priority = item.priority || false;
      try {
        await ensureFront(card, { priority: priority });
      } catch (error) {
        console.warn('Failed to load card:', card.key, error);
      }
    }
    
    isLoading = false;
  }
  
  function queueCardLoad(card, priority) {
    priority = priority || false;
    loadingQueue.push({ card: card, priority: priority });
    processLoadingQueue();
  }
  
  // Utility functions
  function fetchWithRetry(url, opt, tries, delay) {
    opt = opt || {};
    tries = tries || 3;
    delay = delay || 350;
    
    var last;
    return (function attempt(i) {
      return fetch(url, opt).then(function(res) {
        if (!res.ok) {
          return res.text().then(function(errorText) {
            console.error("HTTP " + res.status + " error for " + url + ":", errorText);
            throw new Error("HTTP " + res.status + ": " + errorText);
          }).catch(function() {
            throw new Error("HTTP " + res.status + ": No error details available");
          });
        }
        return res;
      }).catch(function(e) {
        last = e;
        console.warn("Attempt " + (i + 1) + "/" + tries + " failed for " + url + ":", e.message);
        if (i < tries - 1) {
          return new Promise(function(r) {
            setTimeout(r, delay * Math.pow(2, i));
          }).then(function() {
            return attempt(i + 1);
          });
        }
        throw last;
      });
    })(0);
  }
  
  // Geometry calculations
  function spanDeg(n) {
    return (n <= 10 ? 12 : n >= 30 ? 4 : 12 - 8 * (n - 10) / 20);
  }
  
  function rowGeom(cnt, cw, W) {
    var s = spanDeg(cnt);
    var min = -s/2;
    var max = s/2;
    var spread = cnt === 1 ? 0 : (W - cw) / (cnt - 1);
    var vR = Math.max(cw * .09, 8);
    var c = ((cnt - 1) * spread) / 2;
    var result = [];
    for (var i = 0; i < cnt; i++) {
      result.push({
        left: i * spread,
        tx: 0,
        ty: -Math.sin((min + (max - min) * i / (cnt - 1)) * Math.PI / 180) * vR,
        rot: min + (max - min) * i / (cnt - 1),
        stackX: c - i * spread,
        stackY: 0,
        stackR: 0
      });
    }
    return result;
  }
  
  function styleCard(el, g, i, total) {
    el.style.left = g.left + 'px';
    el.style.setProperty('--tx', g.tx + 'px');
    el.style.setProperty('--ty', g.ty + 'px');
    el.style.setProperty('--rot', g.rot + 'deg');
    el.style.setProperty('--stackX', g.stackX + 'px');
    el.style.setProperty('--stackY', g.stackY + 'px');
    el.style.setProperty('--stackR', g.stackR + 'deg');
    // Add micro-spread variables for subtle animation
    el.style.setProperty('--i', i || 0);
    el.style.setProperty('--mid', total ? (total - 1) / 2 : 0);
    /* NEW: bounded stagger index (0..7) */
    el.style.setProperty('--i-del', i % 8);
  }
  
  function tidyRows() {
    var W = document.getElementById('fan-tableau').offsetWidth;
    var rows = document.querySelectorAll('.fan-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.marginTop = i ? (W < 600 ? '-20vw' : '-13vw') : '0';
    }
  }
  
  function updateZ() {
    var rows = document.querySelectorAll('.fan-row');
    for (var r = 0; r < rows.length; r++) {
      var cards = Array.prototype.slice.call(rows[r].children).sort(function(a, b) {
        return a.offsetLeft - b.offsetLeft;
      });
      for (var i = 0; i < cards.length; i++) {
        cards[i].style.zIndex = r * PER_ROW + i;
      }
    }
  }
  
  function showDeckLoaded() {
    var deckCount = document.getElementById('deckCount');
    var deckInfo = document.getElementById('deckInfo');
    
    if (deckCount) deckCount.style.display = 'flex';
    if (deckInfo) deckInfo.style.display = 'flex';

    updateCounts();
  }
  
  // Collapsed mode helpers
  function collapsedCW() {
    return Math.round(130 * cardScale); // one source of truth
  }
  
  function applyCollapsedSize() {
    var cw = collapsedCW();
    var deckWrap = document.querySelector('.deck-wrapper');
    if (deckWrap) deckWrap.style.setProperty('--cw', cw + 'px');
    // In collapsed mode, .discard-stack is width:100%; otherwise set explicit width.
    var pileStack = document.getElementById('discardStack');
    if (collapsed) {
      if (pileStack) pileStack.style.removeProperty('width'); // let CSS (100%) take over
    } else {
      if (pileStack) pileStack.style.width = collapsedCW() + 'px'; // keep discard responsive to slider
    }
  }
  
  function syncDiscardSize() {
    if (collapsed) {
      // CSS uses width:100% in collapsed mode; just ensure --cw is fresh
      applyCollapsedSize();
    } else {
      // Non-collapsed: discard should still track the size dropdown
      var pileStack = document.getElementById('discardStack');
      if (pileStack) {
        pileStack.style.width = collapsedCW() + 'px';
      }
    }
  }
  
  function updateCounts() {
    var deckCount = document.getElementById('deckCount');
    var discardCount = document.getElementById('discardCount');
    var pileArea = document.getElementById('discardArea');
    var pileStack = document.getElementById('discardStack');
    
    if (deckCount) deckCount.textContent = deck.length;
    if (discardCount) discardCount.textContent = discard.length;
    
    var has = discard.length > 0;
    if (pileArea) pileArea.classList.toggle('has-cards', has);
    if (pileStack) {
      if (has) {
        pileStack.setAttribute('draggable', 'true');
      } else {
        pileStack.removeAttribute('draggable');
      }
    }
    
    // Update small discard badge
    var smallBadge = document.getElementById('discardBadgeSmall');
    var smallCount = document.getElementById('discardCountSmall');
    if (smallBadge && smallCount) {
      smallCount.textContent = discard.length;
      // Show badge only when fan is out and there are discarded cards
      if (!collapsed && discard.length > 0) {
        smallBadge.style.display = 'flex';
      } else {
        smallBadge.style.display = 'none';
      }
    }
  }
  
  // Fast fan building - show all cards immediately with back images
  function buildFanFast() {
    var fan = document.getElementById('fan-tableau');
    if (!fan) return;
    
    fan.innerHTML = '';
    var W = fan.offsetWidth;
    var rows = Math.ceil(deck.length / PER_ROW);
    var frag = document.createDocumentFragment();

    // Build all rows immediately with back images
    for (var r = 0; r < rows; r++) {
      var slice = deck.slice(r * PER_ROW, (r + 1) * PER_ROW);

      // Row container
      var row = document.createElement('div');
      row.className = 'fan-row';
      row.setAttribute('role', 'list');
      frag.appendChild(row);

      // --- Card width (scaled) --------------------------------------
      var MAX_W = 140, MIN_W = 90;
      var cols = Math.min(slice.length, 8);
      var overlapFactor = collapsed ? 1 : 0.6;
      var baseCw = Math.min(MAX_W, Math.max(MIN_W, W / (cols * overlapFactor + 0.25)));
      if (collapsed) baseCw = 130;
      var cw = Math.round(baseCw * cardScale);
      row.style.setProperty('--cw', cw + 'px');

      // --- Place cards ------------------------------------------------
      var geom = rowGeom(slice.length, cw, W);
      for (var i = 0; i < slice.length; i++) {
        var card = slice[i];
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'fan-card';
        c.dataset.id = card.id;
        c.setAttribute('role', 'listitem');
        c.setAttribute('aria-label', card.name || 'Card ' + card.id);
        c.draggable = true;
        c.style.setProperty('--row', r);
        styleCard(c, geom[i], i, slice.length);
        
        // Always show back image initially - no automatic loading
        c.innerHTML = '<img alt="back" src="' + cardBackURL + '" loading="eager">';

        row.appendChild(c);
      }
    }

    // Commit to DOM and refresh layout/counters
    fan.appendChild(frag);
    tidyRows();
    updateZ();
    showDeckLoaded();
    syncDiscardSize();
  }
  
  // Build the fan
  function buildFan() {
    buildFanFast();
  }
  
  // Actions
  // HTML builders
  function flipHTML(c) {
    return '\n    <div class="selected-card" role="group" aria-label="' + (c.name || 'Card') + '" data-card-id="' + c.id + '">\n      <div class="card-wrapper">\n        <div class="card-inner">\n          <div class="card-face card-front"><img alt="' + (c.name || 'front') + '" src="' + c.url + '"></div>\n          <div class="card-face card-back"><img alt="back" src="' + cardBackURL + '"></div>\n        </div>\n      </div>\n      ' + (c.name ? '<div class="label">' + c.name + '</div>' : '') + '\n    </div>';
  }
  
  // Animations
  function flyTo(cardEl, destination, html, onDone, scale, autoFlip) {
    scale = scale || 1;
    autoFlip = autoFlip !== false;
    
    var sRect = cardEl.getBoundingClientRect();
    var final = null;
    var endX, endY;

    if (html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      final = tmp.firstElementChild;
      Object.assign(final.style, { visibility:'hidden', position:'absolute', opacity:0 });
      destination.appendChild(final);
      var fRect = final.getBoundingClientRect();
      endX = fRect.left - sRect.left;
      endY = fRect.top  - sRect.top;
    } else {
      var dRect = destination.getBoundingClientRect();
      endX = (dRect.left + dRect.width/2  - sRect.width/2)  - sRect.left;
      endY = (dRect.top  + dRect.height/2 - sRect.height/2) - sRect.top;
    }

    var clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
      position:'fixed', left:sRect.left+'px', top:sRect.top+'px',
      width:sRect.width+'px', height:sRect.height+'px', margin:0,
      zIndex:9999, pointerEvents:'none', background:'transparent',
      transition:'transform .65s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.4,.5,.5,1)',
      boxShadow:'0 8px 40px 8px rgba(39,123,250,.09)'
    });
    document.body.appendChild(clone);
    cardEl.style.visibility = 'hidden';

    requestAnimationFrame(function() {
      clone.style.transform = 'translate(' + endX + 'px, ' + endY + 'px) scale(' + scale + ')';
      clone.style.opacity = '.38';
    });

    var onEnd = function() {
      clone.remove();
      if (final) {
        Object.assign(final.style, { visibility:'', position:'', opacity:'' });
        if (autoFlip) {
          setTimeout(function() {
            var wrapper = final.querySelector('.card-wrapper');
            if (wrapper) wrapper.classList.add('flipped');
          }, FLIP_DELAY);
        }
      }
      cardEl.remove();
      if (onDone) onDone(final);
    };
    clone.addEventListener('transitionend', onEnd, {once:true});
  }
  
  function toReveal(card, el, fly) {
    // Build placeholder (front uses back image for seamless spin-in)
    var placeholderHTML = flipHTML({ ...card, url: cardBackURL });

    // Arm flip only after *priority* front decode
    var armFlip = function(wrapper) {
      // If card already has URL, use it immediately
      if (card.url) {
        var frontImg = wrapper.querySelector('.card-front img');
        frontImg.src = card.url;
        requestAnimationFrame(function() {
          wrapper.querySelector('.card-wrapper')?.classList.add('flipped');
        });
        var loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.remove('visible');
        return;
      }
      
      // Otherwise, wait for it to load with priority
      ensureFront(card, {priority:true}).then(function(url) {
        if (!url) {
          var loadingIndicator = document.getElementById('loadingIndicator');
          if (loadingIndicator) loadingIndicator.classList.remove('visible');
          return;
        }
        var frontImg = wrapper.querySelector('.card-front img');
        frontImg.src = url;
        requestAnimationFrame(function() {
          wrapper.querySelector('.card-wrapper')?.classList.add('flipped');
        });
        var loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.remove('visible');
      });
    };

    var finalize = function(wrapper) {
      deck = deck.filter(function(c) { return c.id !== card.id; });
      revealed.push(card);
      updateCounts();
      if (wrapper) armFlip(wrapper);
    };

    if (fly) {
      flyTo(el, document.getElementById('selectedArea'), placeholderHTML, finalize, 1.07, false);
    } else {
      if (el) el.remove();
      updateCounts();
      var selected = document.getElementById('selectedArea');
      selected.insertAdjacentHTML('beforeend', placeholderHTML);
      finalize(selected.lastElementChild);
    }
  }
  
  function toDiscard(card, el, fly) {
    if (!allowDiscard) return;
    var finalize = function() {
      deck = deck.filter(function(c) { return c.id !== card.id; });
      discard.push(card);
      updateCounts();
    };
    if (fly) {
      flyTo(el, document.getElementById('discardStack'), '', finalize, 0.93);
    } else {
      if (el) el.remove();
      finalize();
    }
  }
  
  // Modal functions
  function openModal(index) {
    currentModalIndex = index;
    showCardInModal(currentModalIndex);

    // Always display the modal
    var modal = document.getElementById('cardImageModal');
    if (modal) modal.style.display = 'block';

    // Always display the nav (so "Show Details" is available).
    var modalNav = document.getElementById('modalNav');
    if (modalNav) modalNav.style.display = 'flex';

    // Still disable prev/next if needed
    var prevBtn = document.getElementById('modalPrev');
    var nextBtn = document.getElementById('modalNext');
    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === revealed.length - 1);
  }

  function showCardInModal(idx) {
    var cd = revealed[idx];
    if (!cd) return;

    // If we haven't stored a "currentOrientation" yet, default it to the server's orientation
    if (typeof cd.currentOrientation === 'undefined') {
      cd.currentOrientation = cd.orientation || 'upright';
    }

    var modalImg = document.getElementById('modalImg');
    var modalCaption = document.getElementById('modalCaption');
    var detailsSide = document.getElementById('modalDetailsSide');
    var modalContentWrapper = document.getElementById('modalContentWrapper');
    var toggleDetailsBtn = document.getElementById('modalToggleDetails');
    var prevBtn = document.getElementById('modalPrev');
    var nextBtn = document.getElementById('modalNext');

    // 1) If we have an image
    if (cd.url && modalImg) {
      modalImg.src = cd.url;
      // Always apply transform based on the *current* orientation
      modalImg.style.transform =
        (cd.currentOrientation === 'reversed')
          ? 'rotate(180deg)'
          : 'rotate(0)';
      modalImg.style.display = 'block';
    } else if (modalImg) {
      // No image
      modalImg.src = '';
      modalImg.style.display = 'none';
    }

    // If details are NOT visible, let's ensure the large class is added
    var modalImageDiv = document.querySelector('.modal-image');
    if (!detailsVisible && modalImageDiv) {
      modalImageDiv.classList.add('modal-image-large');
    } else if (modalImageDiv) {
      modalImageDiv.classList.remove('modal-image-large');
    }

    // 2) Set the caption
    var mainWord = cd.name || 'Card #' + cd.id;
    if (modalCaption) modalCaption.textContent = mainWord;

    // 3) Clear out & rebuild the right‐side details
    if (detailsSide) {
      detailsSide.innerHTML = '';
      // For now, just show basic card info
      detailsSide.innerHTML = '\n        <h3>' + mainWord + '</h3>\n        <p><strong>Card ID:</strong> ' + cd.id + '</p>\n        <p><strong>Key:</strong> ' + cd.key + '</p>\n        <p><strong>URL:</strong> ' + (cd.url || 'Not loaded') + '</p>\n      ';

      if (detailsVisible) {
        detailsSide.style.display = 'block';
        if (modalContentWrapper) modalContentWrapper.classList.add('show-details');
        if (toggleDetailsBtn) toggleDetailsBtn.textContent = 'Hide Details';
      } else {
        detailsSide.style.display = 'none';
        if (modalContentWrapper) modalContentWrapper.classList.remove('show-details');
        if (toggleDetailsBtn) toggleDetailsBtn.textContent = 'Show Details';
      }
    }

    // 4) Prev/Next button states
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx === revealed.length - 1);
  }

  function closeModal() {
    var modal = document.getElementById('cardImageModal');
    if (modal) modal.style.display = 'none';
  }
  
  function restorePile() {
    if (!allowDiscard || !discard.length) return;
    deck.push(discard.pop());
    buildFan();
    updateCounts();
  }
  
  // Shuffle
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = a[i];
      a[i] = a[j];
      a[j] = temp;
    }
  }
  
  function recalc() {
    var fan = document.getElementById('fan-tableau');
    if (!fan) return;
    var W = fan.offsetWidth;

    var rows = document.querySelectorAll('.fan-row');
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var cards = Array.prototype.slice.call(row.children);
      var MAX_W = 140, MIN_W = 90;
      var cols = Math.min(cards.length, 8);
      var overlapFactor = collapsed ? 1 : 0.6;

      var cw;
      if (collapsed) {
        cw = collapsedCW();  // already includes cardScale
      } else {
        var base = Math.min(MAX_W, Math.max(MIN_W, W / (cols * overlapFactor + 0.25)));
        cw = Math.round(base * cardScale); // <-- scale applied in fan view
      }

      row.style.setProperty('--cw', cw + 'px');

      var geom = rowGeom(cards.length, cw, W);
      for (var i = 0; i < cards.length; i++) {
        styleCard(cards[i], geom[i], i, cards.length);
      }
    }

    tidyRows();
    updateZ();
    syncDiscardSize();
  }
  
  function riffle() {
    var fan = document.getElementById('fan-tableau');
    if (fan) {
      fan.classList.add('is-shuffling');
      setTimeout(function() {
        fan.classList.remove('is-shuffling');
      }, RIFFLE_MS_VAR());
    }
  }
  
  function shuffleDeck() {
    shuffleArr(deck);
    buildFan();
    riffle();
  }
  
  // Set collapsed state
  function setCollapsed(s) {
    // While toggling, use row-only stagger so the motion feels solid
    var fan = document.getElementById('fan-tableau');
    if (fan) fan.classList.add('is-toggling');

    if (s && !collapsed) {
      // Phase A: animate to stack (only transforms animate)
      if (fan) fan.classList.add('is-collapsed');
      collapsed = true;

      // Phase B1: switch layout to the narrow column
      var deckWrap = document.querySelector('.deck-wrapper');
      requestAnimationFrame(function() {
        if (deckWrap) deckWrap.classList.add('collapsed-mode');
        applyCollapsedSize(); // sets --cw for collapsed column

        // Phase B2: next frame, recompute left/stack geometry using the NEW width
        requestAnimationFrame(function() {
          recalc();      // left (no animation) + stackX/stackY centered correctly
          tidyRows();
        });
      });
    } else if (!s && collapsed) {
      // Phase A: widen the column first (still collapsed so 'left' won't animate)
      var deckWrap = document.querySelector('.deck-wrapper');
      if (deckWrap) deckWrap.classList.remove('collapsed-mode');
      applyCollapsedSize();

      requestAnimationFrame(function() {
        recalc();  // compute new 'left' for wide fan while still collapsed
        tidyRows();

        // Phase B: drop the collapsed transform; now transform animates to the fan
        requestAnimationFrame(function() {
          if (fan) fan.classList.remove('is-collapsed');
        });
      });

      collapsed = false;
    }

    var collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? 'Fan Out' : 'Collapse';
    }

    // Remove the toggling marker after the animation window
    setTimeout(function() {
      if (fan) fan.classList.remove('is-toggling');
    }, FAN_MS() + 60);
  }
  
  // Reset
  function softReset() {
    deck.push.apply(deck, discard, revealed);
    discard.length = 0;
    revealed.length = 0;
    var selected = document.getElementById('selectedArea');
    if (selected) selected.innerHTML = '';
    shuffleArr(deck);
    buildFanFast();
    updateCounts();
    if (collapsed) recalc();
    
    // Ensure discard pile visibility matches collapsed state
    var deckWrap = document.querySelector('.deck-wrapper');
    if (collapsed) {
      if (deckWrap) deckWrap.classList.add('collapsed-mode');
    } else {
      if (deckWrap) deckWrap.classList.remove('collapsed-mode');
    }
  }
  
  // Load deck data
  function loadDeckMeta() {
    var url = API_DECK + '?key=' + config.deckKey + (config.publicId ? '&public_id=' + config.publicId : '');
    
    return fetchWithRetry(url).then(function(res) {
      return res.json();
    }).then(function(meta) {
      var body = config.publicId ? 
        {filenames:[meta.cardBack], public_id:config.publicId} : 
        {filenames:[meta.cardBack]};
      
      return fetchWithRetry(API_URLS, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      }).then(function(res) {
        return res.json();
      }).then(function(cb) {
        cardBackURL = (cb.images || []).find(function(i) { return i.key === meta.cardBack; });
        cardBackURL = cardBackURL ? cardBackURL.url : '';
        
        var pileStack = document.getElementById('discardStack');
        if (pileStack && cardBackURL) {
          pileStack.style.backgroundImage = 'url(\'' + cardBackURL + '\')';
        }
        
        deck = meta.cards.map(function(c, i) {
          return {
            id: i + 1,
            key: c.frontImageS3Key,
            url: null,
            name: c.title || c.name || ''
          };
        });
        
        return meta;
      });
    });
  }
  
  // Drag and drop utilities
  function makeDragGhost(w, h, src) {
    var g = new Image();
    g.src = src;
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    g.style.borderRadius = '16px';
    g.style.position = 'absolute';
    g.style.top = '-999px';
    g.style.left = '-999px';
    document.body.appendChild(g);
    return g;
  }
  
  // Event handlers
  function setupEventHandlers() {
    var fan = document.getElementById('fan-tableau');
    var pileArea = document.getElementById('discardArea');
    var pileStack = document.getElementById('discardStack');
    var collapseBtn = document.getElementById('collapseBtn');
    var shuffleBtn = document.getElementById('shuffleBtn');
    var resetBtn = document.getElementById('resetBtn');
    var cardSize = document.getElementById('cardSize');
    var enableDiscard = document.getElementById('enableDiscard');
    
    // Click to reveal
    if (fan) {
      fan.addEventListener('click', function(e) {
        var el = e.target.closest('.fan-card');
        if (!el) return;
        var id = parseInt(el.dataset.id);
        var card = deck.find(function(c) { return c.id === id; });
        if (card) {
          // If card doesn't have front image loaded, prioritize it
          if (!card.url) {
            // Move this card to highest priority in loading queue
            loadingQueue.unshift({ card: card, priority: true });
            processLoadingQueue();
            
            // Show loading indicator
            var loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
              loadingIndicator.classList.add('visible');
              var span = loadingIndicator.querySelector('span');
              if (span) span.textContent = 'Loading card...';
            }
          }
          toReveal(card, el, true);
        }
      });
      
      // Right-click to discard
      fan.addEventListener('mousedown', function(e) {
        if (e.button !== 2) return;
        var el = e.target.closest('.fan-card');
        if (!el || !allowDiscard) return;
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(el.dataset.id);
        var card = deck.find(function(c) { return c.id === id; });
        if (card) toDiscard(card, el, true);
      });
      
      fan.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.fan-card')) e.preventDefault();
      });
      
      // Hover lift effects - EXACTLY like deck.html
      fan.addEventListener('mouseenter', function(e) {
        var el = e.target.closest('.fan-card');
        if (el && !collapsed) el.classList.add('is-lifted');
      }, true);
      
      fan.addEventListener('mouseleave', function(e) {
        var el = e.target.closest('.fan-card');
        if (el) el.classList.remove('is-lifted');
      }, true);
      
      fan.addEventListener('focusin', function(e) {
        var el = e.target.closest('.fan-card');
        if (el && !collapsed) el.classList.add('is-lifted');
      });
      
      fan.addEventListener('focusout', function(e) {
        var el = e.target.closest('.fan-card');
        if (el) el.classList.remove('is-lifted');
      });
      
      // Drag start for cards
      fan.addEventListener('dragstart', function(e) {
        var el = e.target.closest('.fan-card');
        if (!el) return;
        var id = parseInt(el.dataset.id);
        var card = deck.find(function(c) { return c.id === id; });
        if (!card) return;

        e.dataTransfer.setData('text/plain', id);
        var g = makeDragGhost(el.offsetWidth, el.offsetHeight, cardBackURL);
        e.dataTransfer.setDragImage(g, g.offsetWidth/2, g.offsetHeight/2);
        el.style.opacity = '0';
        el._ghost = g;
      });
      
      fan.addEventListener('dragend', function(e) {
        var el = e.target.closest('.fan-card');
        if (!el) return;
        if (el.isConnected) el.style.opacity = '1';
        if (el._ghost) {
          el._ghost.remove();
          el._ghost = null;
        }
      });
    }
    
    // Controls
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function() {
        var pileArea = document.getElementById('discardArea');
        
        // If we're about to fan out (currently collapsed), hide discard pile immediately
        if (collapsed) {
          if (pileArea) {
            pileArea.style.opacity = '0';
            pileArea.style.pointerEvents = 'none';
            pileArea.style.transition = 'none'; // Disable transition for immediate hide
          }
        }
        
        setCollapsed(!collapsed);
        
        // If we're now collapsed, remove the inline styles so CSS can control visibility
        if (collapsed) {
          if (pileArea) {
            pileArea.style.removeProperty('opacity');
            pileArea.style.removeProperty('pointer-events');
            pileArea.style.removeProperty('transition'); // Re-enable transitions
          }
        }
      });
    }
    
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', function() {
        var wasCollapsed = collapsed;
        var COLLAPSE_MS = FAN_MS();
        var RIFFLE_WINDOW = RIFFLE_MS_VAR() + 120;

        if (!wasCollapsed) setCollapsed(true);

        setTimeout(function() {
          // Shuffle the array and rebuild the fan
          shuffleArr(deck);
          if (collapsed) {
            recalc();
          } else {
            buildFanFast(); // Use buildFanFast instead of buildFan
          }
          riffle();
          setTimeout(function() {
            if (!wasCollapsed) setCollapsed(false);
            var reopenDelay = wasCollapsed ? 0 : COLLAPSE_MS;
            setTimeout(function() {
              // Re-enable buttons here if needed
            }, reopenDelay);
          }, RIFFLE_WINDOW);
        }, wasCollapsed ? 0 : COLLAPSE_MS);
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', softReset);
    }
    
    // Card size change handler
    if (cardSize) {
      cardSize.addEventListener('change', function() {
        cardScale = parseFloat(cardSize.value) || 1;

        // Update shared sizes first
        applyCollapsedSize();

        if (collapsed) {
          recalc();                 // recompute geometry using new --cw
        } else {
          buildFanFast();           // fan view uses dynamic width; rebuild fast
        }

        syncDiscardSize();          // keep discard looking right in both modes
      });
    }
    
    // Enable discard change handler
    if (enableDiscard) {
      enableDiscard.addEventListener('change', function() {
        allowDiscard = enableDiscard.checked;
        if (pileArea) pileArea.style.display = allowDiscard ? 'flex' : 'none';
        updateCounts();
      });
    }
    
    // Modal event listeners
    var closeBtn = document.getElementById('modalClose');
    var modal = document.getElementById('cardImageModal');
    var nextBtn = document.getElementById('modalNext');
    var prevBtn = document.getElementById('modalPrev');
    var toggleDetailsBtn = document.getElementById('modalToggleDetails');
    var selected = document.getElementById('selectedArea');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (currentModalIndex < revealed.length - 1) {
          currentModalIndex++;
          showCardInModal(currentModalIndex);
        }
      });
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (currentModalIndex > 0) {
          currentModalIndex--;
          showCardInModal(currentModalIndex);
        }
      });
    }
    
    if (toggleDetailsBtn) {
      toggleDetailsBtn.addEventListener('click', function() {
        if (!detailsVisible) {
          // We are about to show details
          var detailsSide = document.getElementById('modalDetailsSide');
          var modalContentWrapper = document.getElementById('modalContentWrapper');
          if (detailsSide) detailsSide.style.display = 'block';
          if (modalContentWrapper) modalContentWrapper.classList.add('show-details'); 
          toggleDetailsBtn.textContent = 'Hide Details';
          detailsVisible = true;

          // Remove the "large" class since details are visible
          var modalImageDiv = document.querySelector('.modal-image');
          if (modalImageDiv) modalImageDiv.classList.remove('modal-image-large');

          if (closeBtn) closeBtn.style.color = '#000';
        } else {
          // We are about to hide details
          var detailsSide = document.getElementById('modalDetailsSide');
          var modalContentWrapper = document.getElementById('modalContentWrapper');
          if (detailsSide) detailsSide.style.display = 'none';
          if (modalContentWrapper) modalContentWrapper.classList.remove('show-details');
          toggleDetailsBtn.textContent = 'Show Details';
          detailsVisible = false;

          // Add the "large" class because the details are now hidden
          var modalImageDiv = document.querySelector('.modal-image');
          if (modalImageDiv) modalImageDiv.classList.add('modal-image-large');

          if (closeBtn) closeBtn.style.color = '#fff';
        }
      });
    }
    
    // Add click handlers to revealed cards
    if (selected) {
      selected.addEventListener('click', function(e) {
        var cardElement = e.target.closest('.selected-card');
        if (cardElement) {
          var cardId = parseInt(cardElement.dataset.cardId);
          var cardIndex = revealed.findIndex(function(card) { return card.id === cardId; });
          if (cardIndex !== -1) {
            openModal(cardIndex);
          }
        }
      });
    }
    
    // Drag and drop from pile back to deck
    if (pileStack && allowDiscard) {
      pileStack.addEventListener('dragstart', function(e) {
        if (!discard.length) return;
        e.dataTransfer.setData('text/x-pile', 'top');
        var g = makeDragGhost(pileStack.offsetWidth, pileStack.offsetHeight, cardBackURL);
        e.dataTransfer.setDragImage(g, g.offsetWidth/2, g.offsetHeight/2);
        setTimeout(function() { g.remove(); }, 0);
      });
    }
    
    // Drop on fan from pile
    if (fan && allowDiscard) {
      fan.addEventListener('dragenter', function(e) {
        if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard) {
          deckHover++;
          fan.classList.add('deck-hover');
        }
      });
      
      fan.addEventListener('dragleave', function(e) {
        if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard) {
          deckHover = Math.max(0, --deckHover);
          if (!deckHover) fan.classList.remove('deck-hover');
        }
      });
      
      fan.addEventListener('dragover', function(e) {
        if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard) e.preventDefault();
      });
      
      fan.addEventListener('drop', function(e) {
        if (e.dataTransfer.types.includes('text/x-pile') && allowDiscard) {
          e.preventDefault();
          deckHover = 0;
          fan.classList.remove('deck-hover');
          restorePile();
        }
      });
    }
    
    // Pile accepts card discards
    if (pileArea && allowDiscard) {
      ['dragenter', 'dragover'].forEach(function(evt) {
        pileArea.addEventListener(evt, function(e) {
          if (!allowDiscard) return;
          e.preventDefault();
          pileArea.classList.add('hover');
        });
      });
      
      ['dragleave', 'drop'].forEach(function(evt) {
        pileArea.addEventListener(evt, function() {
          pileArea.classList.remove('hover');
        });
      });
      
      pileArea.addEventListener('drop', function(e) {
        if (!allowDiscard) return;
        e.preventDefault();
        var id = parseInt(e.dataTransfer.getData('text/plain'));
        var el = fan.querySelector('.fan-card[data-id="' + id + '"]');
        var card = deck.find(function(c) { return c.id === id; });
        if (card && el) toDiscard(card, el, false);
      });
    }
  }
  
  // Initialize
  function init() {
    discard = [];
    revealed = [];
    var selected = document.getElementById('selectedArea');
    if (selected) selected.innerHTML = '';
    collapsed = false; 
    var fan = document.getElementById('fan-tableau');
    if (fan) fan.classList.remove('is-collapsed');
    var deckWrap = document.querySelector('.deck-wrapper');
    if (deckWrap) deckWrap.classList.remove('collapsed-mode');
    var collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) collapseBtn.textContent = 'Collapse';

    createDeckHTML();
    setupEventHandlers();
    
    // Set initial state based on config
    if (config.deckView === '1') {
      setCollapsed(true);
    }
    
    loadDeckMeta().then(function() {
      shuffleArr(deck);
      
      // Use fast fan building - show all cards immediately with back images
      buildFanFast();

      // Start background loading immediately
      idleWarm();
    }).catch(function(error) {
      console.error('Failed to load deck:', error);
    });
  }
  
  // Idle background warm-up (fallback-friendly, Safari-safe)
  function idleWarm() {
    var warm = function() {
      // Don't preload any cards - only load when clicked
      // This keeps the fan fast and responsive
      console.log('Fan ready - cards will load on demand when clicked');
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warm, { timeout: 2000 });
    } else {
      setTimeout(warm, 300);
    }
  }
  
  // Start initialization
  init();
}();
