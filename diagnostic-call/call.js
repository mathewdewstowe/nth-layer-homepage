(function () {
  var M = window.NthCall;
  var R = window.NthReport;
  var STEPS = [
    { id: "setup", name: "Setup", section: "opening" },
    { id: "opening", name: "Opening", section: "opening" },
    { id: "decide", name: "Decide", section: "trace", stage: "decide" },
    { id: "build", name: "Build", section: "trace", stage: "build" },
    { id: "test", name: "Test", section: "trace", stage: "test" },
    { id: "release", name: "Release", section: "trace", stage: "release" },
    { id: "measure", name: "Measure", section: "trace", stage: "measure" },
    { id: "bottleneck", name: "Bottleneck", section: "bottleneck" },
    { id: "priorities", name: "Priorities", section: "priorities" },
    { id: "close", name: "Close", section: "close" }
  ];
  var library = null;
  var session = null;
  var step = 0;
  var timer = null;
  var sectionId = "opening";
  var sectionLeft = 3 * 60;

  function $(id) { return document.getElementById(id); }
  function key(id) { return "nth-dx:" + id; }

  function persist() {
    localStorage.setItem(key(session.id), JSON.stringify(session));
    localStorage.setItem("nth-dx:latest", session.id);
    sessionStorage.setItem("nth-dx-step:" + session.id, String(step));
  }

  function loadSession() {
    var q = new URLSearchParams(location.search);
    if (q.get("demo") === "1") return M.exampleSession();
    if (q.get("d")) {
      try { return M.decodeSession(q.get("d")); } catch (e) { return M.blankSession(); }
    }
    var id = q.get("s") || localStorage.getItem("nth-dx:latest");
    if (id) {
      var raw = localStorage.getItem(key(id));
      if (raw) {
        try { return M.decodeSession(M.encodeSession(JSON.parse(raw))); } catch (e) {}
      }
    }
    var fresh = M.blankSession();
    fresh.date = new Date().toISOString().slice(0, 10);
    return fresh;
  }

  function ensureSuggestions() {
    if (!M.scoresReady(session) || !library) return;
    if (!session.actions || !session.actions.length) session.actions = M.suggestActions(session, library);
    if (!session.risks || !session.risks.length) session.risks = M.suggestRisks(session);
    session.actions.forEach(function (a) { if (a.accepted == null) a.accepted = true; });
  }

  function syncCycle() {
    var total = 0;
    var any = false;
    M.STAGES.forEach(function (s) {
      var w = M.weeksOf(session.stages[s.id]);
      if (w != null) { total += w; any = true; }
    });
    if (any && !session.cycleTime) session.cycleTime = M.formatWeeks(Math.round(total * 10) / 10);
  }

  function current() { return STEPS[step]; }

  function go(n) {
    step = Math.max(0, Math.min(STEPS.length - 1, n));
    var nextSection = current().section;
    if (nextSection !== sectionId) {
      sectionId = nextSection;
      var spec = M.RUN.filter(function (r) { return r.id === sectionId; })[0];
      sectionLeft = spec ? spec.seconds : 0;
    }
    if (step > 0 && !timer) startTimer();
    ensureSuggestions();
    render();
    persist();
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(function () {
      session.timerElapsed = (session.timerElapsed || 0) + 1;
      if (sectionLeft > 0) sectionLeft -= 1;
      paintClock();
    }, 1000);
    $("t-pause").textContent = "Pause";
  }

  function pauseTimer() {
    if (timer) { clearInterval(timer); timer = null; $("t-pause").textContent = "Resume"; persist(); }
    else startTimer();
  }

  function paintClock() {
    $("t-all").textContent = M.clock(session.timerElapsed || 0);
    var spec = M.RUN.filter(function (r) { return r.id === sectionId; })[0];
    $("t-sec-name").textContent = spec ? spec.name : "";
    $("t-sec").textContent = M.clock(sectionLeft);
    $("bar-co").textContent = session.company || "New session";
  }

  function paintDots() {
    $("dots").innerHTML = STEPS.map(function (s, i) {
      var cls = i === step ? "now" : i < step ? "done" : "";
      return '<li><button type="button" class="' + cls + '" data-step="' + i + '" aria-label="' + s.name + '"></button></li>';
    }).join("");
  }

  function paintRail() {
    var o = M.overall(session);
    var dial = o == null ? "" : "<h2>Overall</h2>" + R.dialSvg(o);
    $("rail").innerHTML = dial + "<h2>Stages</h2>" + R.barsHtml(session) + "<h2>Matrix</h2>" + R.matrixSvg(session, { caption: false });
  }

  function scoreRow(stageId) {
    var row = session.stages[stageId];
    var btns = [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" data-score="' + n + '"' + (row.score === n ? ' class="on"' : "") + ">" + n + "</button>";
    }).join("");
    var mean = row.score ? M.findingMeaning(stageId, row.score) : "Press 1 to 5. 1 is early. 5 keeps up with AI coding.";
    var draft = row.fromIntake ? '<p class="draft">Draft from the intake</p>' : "";
    return draft +
      '<div class="scores" role="group" aria-label="Score">' + btns + '</div>' +
      '<p class="means" id="means">' + R.esc(mean) + '</p>' +
      '<div class="fields"><label>Weeks spent<input id="weeks" type="number" min="0" step="0.5" placeholder="no data" value="' + (row.weeks == null ? "" : row.weeks) + '"></label>' +
      '<label>Notes<textarea id="notes">' + R.esc(row.notes || "") + '</textarea></label></div>';
  }

  function renderStep() {
    var s = current();
    var body = "";
    if (s.id === "setup") {
      body = '<p class="step-k">1 · Setup</p><h1>Who is on the call</h1>' +
        '<div class="setup">' +
        '<label>Company<input id="f-company" value="' + R.esc(session.company || "") + '"></label>' +
        '<label>Person<input id="f-person" value="' + R.esc(session.person || "") + '"></label>' +
        '<label>Date conducted<input id="f-date" type="date" value="' + R.esc(session.date || "") + '"></label>' +
        '<label>Feature traced<input id="f-feature" value="' + R.esc(session.feature || "") + '"></label>' +
        '</div>' +
        (session.intake ? '<p class="means">Scores are already filled from the 10-question intake. Confirm them on each stage.</p>' : '<p class="means"><a href="/diagnostic-call/intake/">Run the 10-question intake</a> first if you have not.</p>');
    } else if (s.id === "opening") {
      body = '<p class="step-k">2 · Opening · 3 min</p><h1>Open the call</h1><ol class="open-lines">' +
        '<li>We will trace one feature from the idea to the customer.</li>' +
        '<li>Five stages: decide, build, test, release, measure.</li>' +
        '<li>You keep the scorecard whether we work together or not.</li></ol>';
    } else if (s.stage) {
      var n = STEPS.indexOf(s) + 1;
      var qs = M.PROMPTS[s.stage].map(function (q) { return "<li>" + R.esc(q) + "</li>"; }).join("");
      body = '<p class="step-k">' + n + " · " + s.name + '</p><h1>' + s.name + '</h1><ol class="qs">' + qs + '</ol>' + scoreRow(s.stage);
    } else if (s.id === "bottleneck") {
      ensureSuggestions();
      var b = M.bottleneck(session);
      var line = b
        ? b.name + " is the lowest score" + (b.weeks != null ? ", and this feature waited " + M.formatWeeks(b.weeks) + " there." : ".")
        : "Set the five scores first. Then this sentence writes itself.";
      body = '<p class="step-k">8 · Bottleneck · 5 min</p><h1>Read this out</h1><p class="readout">' + R.esc(line) + '</p>' +
        '<label>Release frequency<select id="f-freq">' +
        ["unsaid|Not said", "weekly|Weekly", "2-weeks|Every 2 weeks", "monthly|Monthly", "6-weeks|Every 6 weeks", "quarterly|Quarterly", "slower|Slower than quarterly"].map(function (opt) {
          var p = opt.split("|");
          return '<option value="' + p[0] + '"' + (session.releaseFrequency === p[0] ? " selected" : "") + ">" + p[1] + "</option>";
        }).join("") + "</select></label>";
    } else if (s.id === "priorities") {
      ensureSuggestions();
      var cards = (session.actions || []).filter(function (a) { return a.rank <= 3; }).map(function (a) {
        return '<article class="pcard' + (a.accepted === false ? " off" : "") + '" data-id="' + R.esc(a.id) + '">' +
          '<input class="tick" type="checkbox" data-accept ' + (a.accepted === false ? "" : "checked") + ' aria-label="Accept">' +
          '<div><h2>' + R.esc(a.text) + '</h2><p>' + R.esc(a.why) + '</p></div>' +
          '<button type="button" class="btn ghost" data-swap>Swap</button></article>';
      }).join("");
      body = '<p class="step-k">9 · Priorities · 4 min</p><h1>Three moves for 90 days</h1><div class="cards">' + (cards || "<p>Set the five scores to get suggestions.</p>") + '</div>';
    } else {
      var o = M.overall(session);
      var b2 = M.bottleneck(session);
      body = '<p class="step-k">10 · Close · 1 min</p><h1>Generate the report</h1>' +
        '<p class="readout">' + R.esc(session.company || "This company") + (o == null ? "" : " scores " + o.toFixed(1) + " out of 5") + (b2 ? ". The bottleneck is " + b2.name + "." : ".") + '</p>' +
        '<button type="button" class="btn big" id="gen">Generate report</button>' +
        '<p class="later"><button type="button" class="tiny" id="show-tr" style="margin:0">Add transcript later</button></p>' +
        '<div id="tr" hidden><label>Paste call transcript<textarea id="f-transcript">' + R.esc(session.transcript || "") + '</textarea></label>' +
        '<p><button type="button" class="btn ghost" id="analyse">Analyse transcript</button></p><p id="analyse-note"></p><div id="highlight" class="hi"></div></div>';
    }
    var back = step === 0 ? "" : '<button type="button" class="btn ghost" id="back">Back</button>';
    var next = step === STEPS.length - 1 ? "" : '<button type="button" class="btn" id="next">Next</button>';
    $("step").innerHTML = body + '<div class="nav">' + back + next + '</div>';
  }

  function readStep() {
    var s = current();
    if (s.id === "setup") {
      session.company = $("f-company").value.trim();
      session.person = $("f-person").value.trim();
      session.date = $("f-date").value;
      session.feature = $("f-feature").value.trim();
    }
    if (s.stage) {
      var w = $("weeks").value.trim();
      session.stages[s.stage].weeks = w === "" ? null : Number(w);
      session.stages[s.stage].notes = $("notes").value;
    }
    if (s.id === "bottleneck" && $("f-freq")) session.releaseFrequency = $("f-freq").value;
    if ($("f-transcript")) session.transcript = $("f-transcript").value;
    syncCycle();
  }

  function setScore(n) {
    var s = current();
    if (!s.stage) return;
    session.stages[s.stage].score = n;
    session.stages[s.stage].fromIntake = false;
    ensureSuggestions();
    render();
    persist();
  }

  function render() {
    paintClock();
    paintDots();
    paintRail();
    renderStep();
  }

  function typing(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function shareUrl() {
    var code = M.encodeSession(session);
    var full = location.origin + "/diagnostic-call/?d=" + code;
    if (full.length < 7000) return full;
    persist();
    return location.origin + "/diagnostic-call/?s=" + encodeURIComponent(session.id);
  }

  function openReport() {
    readStep();
    ensureSuggestions();
    syncCycle();
    session.actions = (session.actions || []).filter(function (a) { return a.accepted !== false; });
    session.actions.forEach(function (a, i) { a.rank = i + 1; });
    persist();
    var url = shareUrl().replace("/diagnostic-call/", "/diagnostic-call/scorecard/");
    window.open(url, "_blank");
  }

  var LOCAL_TERMS = ["decide", "decision", "build", "copilot", "test", "testing", "regression", "release", "deploy", "measure", "adoption", "usage", "metric", "week", "weeks", "month", "stuck", "wait", "bottleneck", "flag"];

  async function analyse() {
    readStep();
    var note = $("analyse-note");
    if (!session.transcript || !session.transcript.trim()) { note.textContent = "Paste a transcript first."; return; }
    var data = null;
    try {
      var res = await fetch("/api/analyse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: session.transcript }) });
      data = await res.json();
    } catch (e) {
      data = { configured: false };
    }
    if (!data || data.configured === false) {
      note.textContent = "AI analysis not configured. Keywords are highlighted. Set NTH_LLM_API_KEY to switch it on.";
      var safe = R.esc(session.transcript);
      LOCAL_TERMS.forEach(function (t) {
        safe = safe.replace(new RegExp("\\b(" + t + ")\\b", "gi"), "<mark>$1</mark>");
      });
      $("highlight").innerHTML = "<p>" + safe.replace(/\n/g, "<br>") + "</p>";
      return;
    }
    var scores = data.scores || {};
    M.STAGES.forEach(function (st) {
      if (scores[st.id] >= 1 && scores[st.id] <= 5) {
        session.stages[st.id].score = Math.round(scores[st.id]);
        session.stages[st.id].fromIntake = false;
      }
      if (data.notes && data.notes[st.id]) session.stages[st.id].notes = M.stripDashes(data.notes[st.id]);
    });
    if (data.quotes) session.quotes = [M.stripDashes(data.quotes[0] || ""), M.stripDashes(data.quotes[1] || "")];
    persist();
    note.textContent = "Suggestions applied. Generate the report again to refresh it.";
  }

  document.body.addEventListener("click", function (e) {
    if (e.target.id === "next") { readStep(); go(step + 1); }
    else if (e.target.id === "back") { readStep(); go(step - 1); }
    else if (e.target.id === "gen") openReport();
    else if (e.target.id === "t-pause") pauseTimer();
    else if (e.target.id === "rail-toggle") {
      document.body.classList.toggle("rail-off");
      e.target.setAttribute("aria-pressed", document.body.classList.contains("rail-off") ? "false" : "true");
    } else if (e.target.id === "show-tr") {
      $("tr").hidden = !$("tr").hidden;
    } else if (e.target.id === "analyse") analyse();
    else if (e.target.hasAttribute("data-score")) setScore(Number(e.target.getAttribute("data-score")));
    else if (e.target.hasAttribute("data-step")) { readStep(); go(Number(e.target.getAttribute("data-step"))); }
    else if (e.target.hasAttribute("data-swap")) {
      var card = e.target.closest(".pcard");
      var id = card.getAttribute("data-id");
      var i = session.actions.findIndex(function (a) { return a.id === id; });
      var a = session.actions[i];
      var items = M.libraryItems(library, a.stage, a.level || M.levelFor(session.stages[a.stage].score || 3));
      if (!items.length) return;
      var idx = 0;
      items.forEach(function (item, n) { if (item.text === a.text) idx = n; });
      var next = items[(idx + 1) % items.length];
      next.rank = a.rank;
      next.priority = a.priority;
      next.accepted = a.accepted !== false;
      session.actions[i] = next;
      render();
      persist();
    }
  });

  document.body.addEventListener("change", function (e) {
    if (e.target.hasAttribute("data-accept")) {
      var card = e.target.closest(".pcard");
      var id = card.getAttribute("data-id");
      var a = session.actions.filter(function (x) { return x.id === id; })[0];
      if (a) a.accepted = e.target.checked;
      card.classList.toggle("off", !e.target.checked);
      persist();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key >= "1" && e.key <= "5" && current().stage && !typing(e.target)) {
      e.preventDefault();
      setScore(Number(e.key));
    } else if (e.key === "ArrowRight" && !typing(e.target)) {
      e.preventDefault();
      readStep();
      go(step + 1);
    } else if (e.key === "ArrowLeft" && !typing(e.target)) {
      e.preventDefault();
      readStep();
      go(step - 1);
    }
  });

  async function boot() {
    try { library = await (await fetch("/diagnostic-call/priorities.json")).json(); } catch (e) { library = {}; }
    session = loadSession();
    ensureSuggestions();
    var q = new URLSearchParams(location.search);
    var asked = q.get("step");
    if (asked) {
      var found = STEPS.findIndex(function (s) { return s.id === asked; });
      if (found >= 0) step = found;
    } else {
      var saved = sessionStorage.getItem("nth-dx-step:" + session.id);
      if (saved != null && STEPS[Number(saved)]) step = Number(saved);
    }
    sectionId = current().section;
    var spec = M.RUN.filter(function (r) { return r.id === sectionId; })[0];
    var clock = M.timerState(session.timerElapsed || 0);
    sectionLeft = spec ? spec.seconds : 0;
    if ((session.timerElapsed || 0) > 0 && clock.section.id === sectionId) sectionLeft = clock.remaining;
    render();
    persist();
  }

  boot();
})();
