/* Shared AI-Native Readiness Diagnostic modal.
   Used by /diagnostic/ and the preview homepages.
   Scoring lives in quiz.js (window.NthDiagnostic). */
(function () {
  if (window.__nthDxModal) return;
  window.__nthDxModal = true;

  var D = window.NthDiagnostic;
  if (!D || !D.questions || !D.scoreOf || !D.bandFor) return;

  var letters = ["A", "B", "C"];
  var modal;
  var quiz;
  var result;
  var title;
  var opts;
  var prog;
  var meter;
  var back;
  var step = 0;
  var answers = [];
  var lastFocus = null;
  var ticket = 0;

  function ensureCss() {
    if (document.getElementById("dx-css")) return;
    var style = document.createElement("style");
    style.id = "dx-css";
    style.textContent = [
      "#dx{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;background:rgba(10,12,10,.62);color:#252423}",
      "#dx[hidden]{display:none!important}",
      "#dx .cm-box{position:relative;width:min(600px,100%);max-width:600px;max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#252423;border-radius:18px;padding:34px 30px 28px;box-shadow:0 24px 60px rgba(0,0,0,.35)}",
      "#dx .cm-x{position:absolute;top:8px;right:12px;width:44px;height:44px;border:0;background:none;font-size:30px;line-height:1;cursor:pointer;color:#555;font-family:inherit}",
      "#dx .kicker{margin:0 0 8px;font:700 12px/1.4 inherit;letter-spacing:.08em;text-transform:uppercase;color:#3F6212}",
      "#dx .prog{margin:0 0 10px;font:700 13px/1 inherit;letter-spacing:.04em;color:#5E5A56}",
      "#dx .meter{height:4px;border-radius:99px;background:#E4DFDA;margin:0 0 18px;overflow:hidden}",
      "#dx .meter span{display:block;height:100%;width:0;background:#BFFF00;border-radius:99px}",
      "@media (prefers-reduced-motion:no-preference){#dx .meter span{transition:width .25s ease}#dx:not([hidden]){animation:dxFade .3s ease-out both}#dx:not([hidden]) .cm-box{animation:dxIn .45s cubic-bezier(.16,1,.3,1) both}}",
      "@keyframes dxFade{from{opacity:0}to{opacity:1}}",
      "@keyframes dxIn{from{opacity:0;transform:translate3d(0,18px,0)}to{opacity:1;transform:none}}",
      "#dx-title,#dx-result-title{font-family:inherit;font-weight:500;font-size:clamp(22px,3vw,28px);line-height:1.2;letter-spacing:-.03em;margin:0 0 18px;color:#252423}",
      "#dx .opts{display:flex;flex-direction:column;gap:10px}",
      "#dx .opt{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;cursor:pointer;background:#fff;color:#252423;border:1px solid #E4DFDA;border-radius:14px;padding:14px;min-height:56px;font:600 16px/1.35 inherit}",
      "#dx .opt:hover{border-color:#252423}",
      "#dx .opt[aria-checked=true]{border-color:#252423;box-shadow:inset 0 0 0 1px #252423;background:#f7ffe0}",
      "#dx .opt .k{flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:#F0EDEA;color:#252423;font:700 13px/1 inherit}",
      "#dx .opt:hover .k,#dx .opt[aria-checked=true] .k{background:#BFFF00}",
      "#dx .row{display:flex;align-items:center;min-height:44px;margin-top:8px}",
      "#dx .back,#dx .again{border:0;background:none;padding:8px 0;cursor:pointer;font:600 14px/1 inherit;color:#5E5A56;text-decoration:underline;text-underline-offset:3px}",
      "#dx .back:hover,#dx .again:hover{color:#252423}",
      "#dx .again{margin-top:16px}",
      "#dx .score{margin:0 0 8px;font-size:15px;color:#5E5A56}",
      "#dx .score strong{color:#252423;font-weight:700;font-size:18px}",
      "#dx .summary{margin:0 0 16px;font-size:16px;line-height:1.55;color:#5E5A56}",
      "#dx .move-k{margin:0 0 4px;font:700 12px/1.4 inherit;letter-spacing:.08em;text-transform:uppercase;color:#3F6212}",
      "#dx .move{margin:0 0 22px;font-size:16px;line-height:1.5}",
      "#dx .ctas{display:flex;flex-wrap:wrap;gap:10px}",
      "#dx .btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:14px 26px;border:0;border-radius:999px;background:#252423;color:#fff;text-decoration:none;cursor:pointer;font:600 16px/1.2 inherit;letter-spacing:-.01em}",
      "#dx .btn::after,#dx .btn::before{display:none!important}",
      "#dx .btn:hover{background:#3a3836}",
      "#dx .ctas .btn{min-width:0;flex:1 1 200px}",
      "#dx .btn-wp{background:transparent;color:#252423;box-shadow:inset 0 0 0 1.5px #252423}",
      "#dx .btn-wp:hover,#dx .btn-wp:focus-visible{background:#BFFF00;color:#141414;box-shadow:inset 0 0 0 1.5px #141414}",
      "#dx .stub{margin-top:22px;padding-top:18px;border-top:1px solid #E4DFDA}",
      "#dx .stub p{margin:0 0 12px;font-size:14px;line-height:1.5;color:#5E5A56}",
      "#dx .stub label{display:block;font:600 13px/1.4 inherit;margin:0 0 6px}",
      "#dx .stub input{width:100%;border:1px solid #d6d8d0;border-radius:10px;padding:11px 12px;background:#fafaf7;font:400 16px/1.4 inherit;color:#252423}",
      "#dx .stub input:focus{outline:2px solid #BFFF00;border-color:#3F6212}",
      "#dx .stub .btn{width:100%;margin-top:12px}",
      "#dx .err{color:#b3261e;font:600 14px/1.4 inherit;margin:10px 0 0}",
      "#dx .stub-msg{font:600 14px/1.45 inherit;color:#252423;margin:10px 0 0}",
      "@media (max-width:600px){#dx .cm-box{padding:28px 18px 22px}#dx .ctas{flex-direction:column}#dx .ctas .btn{width:100%}}",
      "@media (prefers-reduced-motion:reduce){#dx,#dx .cm-box,#dx .meter span{animation:none!important;transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureModal() {
    modal = document.getElementById("dx");
    if (modal) return;
    ensureCss();
    var wrap = document.createElement("div");
    wrap.innerHTML = [
      '<div id="dx" class="cmodal" role="dialog" aria-modal="true" aria-labelledby="dx-title" hidden>',
      '<div class="cm-box">',
      '<button class="cm-x" type="button" aria-label="Close">&times;</button>',
      '<div id="dx-quiz">',
      '<p class="prog" id="dx-prog">1/10</p>',
      '<div class="meter" aria-hidden="true"><span id="dx-meter"></span></div>',
      '<h2 id="dx-title" tabindex="-1"></h2>',
      '<div class="opts" id="dx-opts" role="radiogroup" aria-labelledby="dx-title"></div>',
      '<div class="row"><button class="back" type="button" id="dx-back">Back</button></div>',
      "</div>",
      '<div id="dx-result" hidden>',
      '<p class="kicker">Your result</p>',
      '<p class="score" id="dx-score"></p>',
      '<h2 id="dx-result-title" tabindex="-1"></h2>',
      '<p class="summary" id="dx-summary"></p>',
      '<p class="move-k">Suggested next move</p>',
      '<p class="move" id="dx-next"></p>',
      '<div class="ctas">',
      '<a class="btn" href="https://nthlayer.co.uk/#contact">Book a 30-minute call</a>',
      '<a class="btn btn-wp" href="https://nthlayer.co.uk/#white-paper">Download Whitepaper</a>',
      "</div>",
      '<form class="stub" id="dx-email" novalidate>',
      "<p>Preview only. This box does not send or store your email.</p>",
      '<label for="dx-email-input">Work email</label>',
      '<input id="dx-email-input" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@company.com">',
      '<p class="err" id="dx-email-err" role="alert" hidden></p>',
      '<p class="stub-msg" id="dx-email-msg" role="status" hidden></p>',
      '<button class="btn" type="submit">Email me this result</button>',
      "</form>",
      '<button class="again" type="button" id="dx-again">Start again</button>',
      "</div>",
      "</div>",
      "</div>"
    ].join("");
    modal = wrap.firstChild;
    document.body.appendChild(modal);
  }

  function firstOpener(selector) {
    var all = document.querySelectorAll(selector);
    for (var i = 0; i < all.length; i++) {
      if (!all[i].closest("#dx")) return all[i];
    }
    return null;
  }

  function hookLocal(node, selector) {
    var existing = firstOpener(selector);
    if (!existing) return;
    node.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal({ keepFocus: true });
      existing.click();
    });
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(opts) {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (opts && opts.keepFocus) return;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showQuiz() {
    quiz.hidden = false;
    result.hidden = true;
    modal.setAttribute("aria-labelledby", "dx-title");
    render();
  }

  function begin() {
    step = 0;
    answers = [];
    ticket++;
    openModal();
    showQuiz();
  }

  function render() {
    var q = D.questions[step];
    var n = step + 1;
    prog.textContent = n + "/10";
    prog.setAttribute("aria-label", "Question " + n + " of 10");
    meter.style.width = (n / 10 * 100) + "%";
    title.textContent = q.prompt;
    opts.replaceChildren();
    q.options.forEach(function (label, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", answers[step] === index + 1 ? "true" : "false");
      var k = document.createElement("span");
      k.className = "k";
      k.setAttribute("aria-hidden", "true");
      k.textContent = letters[index];
      var t = document.createElement("span");
      t.textContent = label;
      btn.append(k, t);
      btn.addEventListener("click", function () { choose(index + 1, btn); });
      opts.append(btn);
    });
    back.hidden = step === 0;
    title.focus();
  }

  function choose(value, btn) {
    var mine = ++ticket;
    answers[step] = value;
    Array.prototype.forEach.call(opts.children, function (el) {
      el.disabled = true;
      el.setAttribute("aria-checked", el === btn ? "true" : "false");
    });
    var wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;
    window.setTimeout(function () {
      if (mine !== ticket) return;
      if (step < D.questions.length - 1) {
        step += 1;
        render();
      } else {
        showResult();
      }
    }, wait);
  }

  function showResult() {
    var score = D.scoreOf(answers);
    var band = D.bandFor(score);
    if (score == null || !band) return;
    quiz.hidden = true;
    result.hidden = false;
    modal.setAttribute("aria-labelledby", "dx-result-title");
    var scoreEl = document.getElementById("dx-score");
    scoreEl.replaceChildren();
    var strong = document.createElement("strong");
    strong.textContent = String(score);
    scoreEl.append(strong, document.createTextNode(" of 30"));
    var heading = document.getElementById("dx-result-title");
    heading.textContent = band.name;
    heading.setAttribute("data-band", band.id);
    document.getElementById("dx-summary").textContent = band.summary;
    document.getElementById("dx-next").textContent = band.next;
    document.getElementById("dx-email-err").hidden = true;
    document.getElementById("dx-email-msg").hidden = true;
    document.getElementById("dx-email").hidden = false;
    heading.focus();
  }

  function bindOpener(el) {
    if (!el || el.getAttribute("data-dx-bound") === "1") return;
    el.setAttribute("data-dx-bound", "1");
    el.addEventListener("click", function (e) {
      e.preventDefault();
      begin();
    });
  }

  function boot() {
    ensureModal();
    quiz = document.getElementById("dx-quiz");
    result = document.getElementById("dx-result");
    title = document.getElementById("dx-title");
    opts = document.getElementById("dx-opts");
    prog = document.getElementById("dx-prog");
    meter = document.getElementById("dx-meter");
    back = document.getElementById("dx-back");
    if (!quiz || !result || !title || !opts || !back) return;

    document.querySelectorAll("[data-diagnostic], #start-diagnostic").forEach(bindOpener);
    back.addEventListener("click", function () {
      if (step === 0) return;
      ticket++;
      step -= 1;
      render();
    });
    document.getElementById("dx-again").addEventListener("click", function () {
      step = 0;
      answers = [];
      ticket++;
      showQuiz();
    });
    modal.querySelector(".cm-x").addEventListener("click", function () { closeModal(); });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeModal();
        return;
      }
      if (e.key !== "Tab") return;
      var nodes = modal.querySelectorAll("button, a[href], input");
      var list = [];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].disabled || nodes[i].closest("[hidden]")) continue;
        list.push(nodes[i]);
      }
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var ctas = modal.querySelectorAll(".ctas a");
    if (ctas[0]) hookLocal(ctas[0], "[data-contact]");
    if (ctas[1]) hookLocal(ctas[1], "[data-wpaper]");

    document.getElementById("dx-email").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("dx-email-input");
      var err = document.getElementById("dx-email-err");
      var msg = document.getElementById("dx-email-msg");
      var email = input.value.trim();
      msg.hidden = true;
      if (!input.checkValidity() || !email) {
        err.textContent = "Enter a valid work email.";
        err.hidden = false;
        input.focus();
        return;
      }
      err.hidden = true;
      msg.textContent = "Preview stub. Nothing was sent or stored.";
      msg.hidden = false;
    });

    var auto = false;
    if (document.getElementById("start-diagnostic") && (location.hash === "#start" || /(?:^|[?&])start=1(?:&|$)/.test(location.search))) auto = true;
    if (location.hash === "#diagnostic" || /(?:^|[?&])diagnostic=1(?:&|$)/.test(location.search)) auto = true;
    if (auto) begin();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
