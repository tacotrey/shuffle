/* ===== remote-reveal.js (modal optional) ===== */
!function () {
  /* ---------- where to render cards ---------- */
  var scriptEl = document.currentScript;
  var enableModal = (scriptEl && scriptEl.getAttribute("data-modal") !== "0"); // default = on
  var enableDetails = !!(scriptEl && scriptEl.getAttribute("data-details") === "1"); // default = off

  var container =
    document.getElementById("carddeck-inner") ||
    document.getElementById("carddeck-placeholder") ||
    document.querySelector("[id='carddeck-host']") ||
    (scriptEl && scriptEl.parentNode) ||
    document.body;

  var drawn = document.getElementById("drawnCardArea");
  if (!drawn) {
    drawn = document.createElement("div");
    drawn.id = "drawnCardArea";
    drawn.style.cssText = "margin-top:0;text-align:center;";
    container.appendChild(drawn);
  }

  /* Make the card area a positioning context so the modal can live inside it */
  (function ensureRelative() {
    var cs = getComputedStyle(drawn);
    if (cs.position === "static") drawn.style.setProperty("position", "relative", "important");
  })();

  /* ----------------- styles (once) ----------------- */
  if (!document.getElementById("deck-reveal-css")) {
    var css = document.createElement("style");
    css.id = "deck-reveal-css";
    css.innerHTML =
      ".reveal-cards-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));" +
      "justify-items:center;align-items:stretch;gap:30px;margin:0 auto 1em;max-width:1660px}" +
      ".reveal-cards-row.grid-5{grid-template-columns:repeat(5,1fr)}" +
      ".reveal-cards-row img{width:320px;max-width:100%;aspect-ratio:var(--card-aspect, 13/20);border-radius:18px;" +
      "box-shadow:0 2px 10px rgba(136,88,255,.13);background:#fff;transition:box-shadow .2s,width .2s;cursor:pointer;display:block}" +
      ".reveal-cards-row img:hover{box-shadow:0 4px 20px rgba(136,88,255,.25);transform:scale(1.02)}" +
      ".reveal-cards-row.grid-4 img,.reveal-cards-row.grid-5 img{width:220px}" +
      "@media(max-width:1200px){.reveal-cards-row img{width:200px}}" +
      "@media(max-width:900px){.reveal-cards-row{grid-template-columns:repeat(2,1fr)!important}.reveal-cards-row img{width:150px}}" +
      "@media(max-width:700px){.reveal-cards-row{grid-template-columns:1fr!important;gap:10px}.reveal-cards-row img{width:90vw;max-width:330px;border-radius:8px}}";
    if (enableModal) {
      css.innerHTML +=
        "#drawnCardArea .local-modal{position:absolute;inset:0;background:rgba(0,0,0,.88);" +
        "backdrop-filter:blur(6px);display:none;z-index:50;overflow:hidden;border-radius:12px}" +
        "#drawnCardArea .local-modal__content{position:absolute;top:50%;left:50%;" +
        "transform:translate(-50%,-50%);padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box}" +
        "#drawnCardArea .local-modal__img{display:block;width:auto;max-width:100%;object-fit:contain;" +
        "border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.3)}" +
        "#drawnCardArea .local-modal__caption{margin-top:12px;color:#fff;text-align:center;font-size:1rem}" +
        "#drawnCardArea .local-modal__nav{position:absolute;top:50%;transform:translateY(-50%);" +
        "background:rgba(255,255,255,.12);color:#fff;border:none;border-radius:8px;padding:12px 10px;font-size:18px;cursor:pointer}" +
        "#drawnCardArea .local-modal__nav:hover{background:rgba(255,255,255,.2)}" +
        "#drawnCardArea .local-modal__prev{left:16px}#drawnCardArea .local-modal__next{right:16px}" +
        "#drawnCardArea .local-modal__close{position:absolute;top:10px;right:14px;color:#f1f1f1;font-size:32px;font-weight:700;cursor:pointer;z-index:2}";

      if (enableDetails) {
        css.innerHTML +=
          "#drawnCardArea .local-modal__info{position:absolute;top:10px;left:14px;background:rgba(255,255,255,.12);" +
          "color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:14px;cursor:pointer;z-index:2}" +
          "#drawnCardArea .local-modal__info[disabled]{opacity:.4;cursor:not-allowed}" +
          "#drawnCardArea .local-modal__details{margin-top:10px;color:#fff;text-align:left;max-width:76ch;" +
          "font-size:.95rem;line-height:1.35}" +
          "#drawnCardArea [hidden]{display:none !important}";
      }
    }
    document.head.appendChild(css);
  }

  /* ------------------------ modal build (optional) ------------------------ */
  var modal, modalImg, modalCaption, btnPrev, btnNext, btnClose, btnInfo, detailsBox;
  var currentCards = [];
  var idx = 0;

  if (enableModal) {
    modal = document.createElement("div");
    modal.className = "local-modal";
    modal.innerHTML =
      '<span class="local-modal__close">&times;</span>' +
      '<div class="local-modal__content">' +
      (enableDetails ? '  <button class="local-modal__info" aria-pressed="false" title="Details (i)">Info</button>' : '') +
      '  <button class="local-modal__nav local-modal__prev" disabled>&lt;</button>' +
      '  <button class="local-modal__nav local-modal__next" disabled>&gt;</button>' +
      '  <img class="local-modal__img" />' +
      '  <div class="local-modal__caption"></div>' +
      (enableDetails ? '  <div class="local-modal__details" hidden></div>' : '') +
      '</div>';
    drawn.appendChild(modal);

    modalImg = modal.querySelector(".local-modal__img");
    modalCaption = modal.querySelector(".local-modal__caption");
    btnPrev = modal.querySelector(".local-modal__prev");
    btnNext = modal.querySelector(".local-modal__next");
    btnClose = modal.querySelector(".local-modal__close");
    if (enableDetails) {
      btnInfo = modal.querySelector(".local-modal__info");
      detailsBox = modal.querySelector(".local-modal__details");
    }

    function sizeLocalModal() {
      var vv = window.visualViewport || {};
      var vh = vv.height || window.innerHeight || document.documentElement.clientHeight || 0;
      var areaH = drawn.getBoundingClientRect().height;
      var imgH = Math.max(200, Math.min(vh, areaH - 40));
      var content = modal.querySelector(".local-modal__content");
      content.style.width = Math.min(drawn.clientWidth * 0.95, 1100) + "px";
      content.style.maxHeight = (imgH + 40) + "px";
      modalImg.style.height = imgH + "px";
      modalImg.style.width = "auto";
    }
    new ResizeObserver(sizeLocalModal).observe(drawn);
    window.addEventListener("resize", sizeLocalModal);
    if (window.visualViewport) visualViewport.addEventListener("resize", sizeLocalModal);

    function openModal(i) { idx = i; show(); modal.style.display = "block"; sizeLocalModal(); }
    function closeModal() { modal.style.display = "none"; }
    function show() {
      var c = currentCards[idx];
      modalImg.src = c.url || "";
      modalCaption.textContent = c.title || c.name || ("Card " + (c.id || (idx + 1)));
      btnPrev.disabled = idx === 0;
      btnNext.disabled = idx === currentCards.length - 1;

      if (enableDetails && btnInfo && detailsBox) {
        // Minimal, always-available details: Card name and image URL
        var displayName = c.title || c.name || ("Card " + (c.id || (idx + 1)));
        var idText = (typeof c.id !== 'undefined') ? ("#" + c.id) : "";
        var url = c.url || '';

        var html = '';
        html += '<h3 style="margin:0 0 6px">' + String(displayName) + (idText ? ' <small style="opacity:.7">'+idText+'</small>' : '') + '</h3>';
        if (url) {
          html += '<div style="margin-top:6px">Image URL: ' +
                  '<a href="' + String(url) + '" target="_blank" rel="noopener">open</a>' +
                  '<div style="font-size:12px; opacity:.75; word-break:break-all; margin-top:2px">' + String(url) + '</div>' +
                  '</div>';
        }

        detailsBox.innerHTML = html;
        detailsBox.hidden = true; // start hidden; user toggles with Info button
        btnInfo.disabled = false;
        btnInfo.setAttribute('aria-pressed','false');
      }
    }
    function next() { if (idx < currentCards.length - 1) { idx++; show(); } }
    function prev() { if (idx > 0) { idx--; show(); } }

    btnClose.onclick = closeModal;
    btnNext.onclick = next;
    btnPrev.onclick = prev;
    if (enableDetails && btnInfo && detailsBox) {
      btnInfo.addEventListener('click', function(){
        if (btnInfo.disabled) return;
        var open = detailsBox.hidden === false;
        detailsBox.hidden = open; // toggle
        btnInfo.setAttribute('aria-pressed', open ? 'false' : 'true');
      });
    }
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (modal.style.display === "block") {
        if (e.key === "Escape") closeModal();
        else if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
        else if ((e.key === 'i' || e.key === 'I') && enableDetails && btnInfo && detailsBox && !btnInfo.disabled) {
          e.preventDefault();
          btnInfo.click();
        }
      }
    });
  }

  /* ---------------------------- renderer ---------------------------- */
  window.renderDrawn = function (cards) {
    currentCards = cards || [];
    if (!currentCards.length) { drawn.innerHTML = ""; if (enableModal) drawn.appendChild(modal); return; }

    var cls = (currentCards.length === 4) ? "grid-4" :
              (currentCards.length >= 5) ? "grid-5" : "";
    var row = document.createElement("div");
    row.className = "reveal-cards-row" + (cls ? (" " + cls) : "");

    for (var i = 0; i < currentCards.length; i++) {
      var c = currentCards[i];
      var im = document.createElement("img");
      im.src = c.url || "";
      im.alt = c.title || c.name || ("Card " + (c.id || (i + 1)));
      if (enableModal) {
        im.onclick = (function (n) { return function () { openModal(n); }; })(i);
      }
      im.onerror = function () { this.style.display = "none"; };
      row.appendChild(im);
    }

    drawn.innerHTML = "";
    drawn.appendChild(row);
    if (enableModal) drawn.appendChild(modal);
  };

  /* ------------------------------ init ------------------------------ */
  if (window.drawnCards && window.drawnCards.length) window.renderDrawn(window.drawnCards);
}();
