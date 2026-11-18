(function () {
  var M = window.NthCall;
  var R = window.NthReport;
  var library = null;
  var session = null;
  var timerHandle = null;
  var timerAnchor = 0;
  var suggestions = null;

  function $(id) { return document.getElementById(id); }

  function storageKey(id) { return "nth-dx:" + id; }

  function persist() {
    localStorage.setItem(storageKey(session.id), JSON.stringify(session));
    localStorage.setItem("nth-dx:latest", session.id);
    $("status").textContent = "Saved in this browser.";
  }

  function loadSession() {
    var q = new URLSearchParams(location.search);
    if (q.get("demo") === "1") return M.exampleSession();
    if (q.get("d")) {
      try { return M.decodeSession(q.get("d")); } catch (e) { return M.blankSession(); }
    }
    var id = q.get("s") || localStorage.getItem("nth-dx:latest");
    if (id) {
      var raw = localStorage.getItem(storageKey(id));
      if (raw) {
        try { return M.decodeSession(M.encodeSession(JSON.parse(raw))); } catch (e) {}
      }
    }
    return M.blankSession();
  }

  function shareUrl() {
    var code = M.encodeSession(session);
    var full = location.origin + "/diagnostic-call/?d=" + code;
    if (full.length < 7000) return full;
    persist();
    return location.origin + "/diagnostic-call/?s=" + encodeURIComponent(session.id);
  }

  function readFields() {
    session.company = $("f-company").value.trim();
    session.person = $("f-person").value.trim();
    session.date = $("f-date").value;
    session.feature = $("f-feature").value.trim();
    session.cycleTime = $("f-cycle").value.trim();
    session.releaseFrequency = $("f-freq").value;
    session.transcript = $("f-transcript").value;
    session.quotes = [$("q0").value.trim(), $("q1").value.trim()];
  }

  function fillFields() {
    $("f-company").value = session.company || "";
    $("f-person").value = session.person || "";
    $("f-date").value = session.date || "";
    $("f-feature").value = session.feature || "";
    $("f-cycle").value = session.cycleTime || "";
    $("f-freq").value = session.releaseFrequency || "unsaid";
    $("f-transcript").value = session.transcript || "";
    $("q0").value = (session.quotes && session.quotes[0]) || "";
    $("q1").value = (session.quotes && session.quotes[1]) || "";
    if (session.example) {
      $("banner").hidden = false;
      $("banner").textContent = "Example data. Not a real client.";
    }
  }

  function ensureSuggestions() {
    if (!M.scoresReady(session) || !library) return;
    if (!session.actions || !session.actions.length) session.actions = M.suggestActions(session, library);
    if (!session.risks || !session.risks.length) session.risks = M.suggestRisks(session);
  }

  function renderStages() {
    $("stages").innerHTML = M.STAGES.map(function (s) {
      var row = session.stages[s.id];
      var prompts = M.PROMPTS[s.id].map(function (p) { return "<li>" + R.esc(p) + "</li>"; }).join("");
      var taps = [1, 2, 3, 4, 5].map(function (n) {
        return '<button type="button" data-score="' + n + '"' + (row.score === n ? ' class="on"' : "") + ">" + n + "</button>";
      }).join("");
      return '<article class="stage" data-stage="' + s.id + '" id="stage-' + s.id + '">' +
        '<header><h2>' + s.name + '</h2><span class="badge"' + (row.fromIntake ? "" : " hidden") + '>Draft from intake</span></header>' +
        '<ol class="prompts">' + prompts + '</ol>' +
        '<div class="taps" role="group" aria-label="' + s.name + ' score">' + taps + '</div>' +
        '<div class="meta"><label>Weeks on this feature <input data-weeks type="number" min="0" step="0.5" placeholder="no data" value="' + (row.weeks == null ? "" : row.weeks) + '"></label>' +
        '<label>Notes <textarea data-notes rows="3">' + R.esc(row.notes || "") + '</textarea></label></div></article>';
    }).join("");
  }

  function renderAsk() {
    var weak = M.weakness(session).slice(0, 2);
    if (!weak.length) {
      $("ask").innerHTML = "<h2>Ask these first</h2><p class='note'>Run the intake, or set the five scores, and the weakest stages land here.</p>";
      return;
    }
    var html = "<h2>Ask these first</h2><p class='note'>Weakest stages from the draft. Confirm the score, then write what they say.</p><ol>";
    weak.forEach(function (row) {
      M.PROMPTS[row.id].slice(0, 2).forEach(function (p) {
        html += "<li><strong>" + R.esc(row.name) + ".</strong> " + R.esc(p) + "</li>";
      });
    });
    $("ask").innerHTML = html + "</ol>";
  }

  function renderSummary() {
    var o = M.overall(session);
    var b = M.bottleneck(session);
    var q = M.matrixOf(session).quadrant;
    var tops = (session.actions || []).filter(function (a) { return a.rank <= 3; });
    $("summary").innerHTML =
      "<h2>Live summary</h2>" +
      "<p><strong>" + (o == null ? "Scores incomplete" : o.toFixed(1) + " / 5") + "</strong>" +
      (q ? " · " + R.esc(q.label) : "") + "</p>" +
      R.dialSvg(o) +
      R.matrixSvg(session) +
      R.barsHtml(session) +
      "<p><strong>Bottleneck.</strong> " + R.esc(b ? M.bottleneckWhy(session) : "Set the five scores.") + "</p>" +
      (tops.length ? "<p><strong>90 days.</strong> " + tops.map(function (a) { return R.esc(a.text); }).join("; ") + ".</p>" : "");
    M.STAGES.forEach(function (s) {
      var el = $("stage-" + s.id);
      if (!el) return;
      el.classList.toggle("hot", !!(b && b.id === s.id));
    });
  }

  function renderActions() {
    var html = (session.actions || []).map(function (a, i) {
      return '<article class="card' + (a.rank <= 3 ? " top" : "") + '" data-i="' + i + '">' +
        '<p><strong>' + a.rank + ".</strong> " + R.esc(a.priority) + " · " + R.esc(a.stage) + "</p>" +
        '<label>Action <input data-k="text" value="' + R.esc(a.text) + '"></label>' +
        '<div class="grid2"><label>Priority <select data-k="priority">' + ["High", "Medium", "Low"].map(function (p) {
          return '<option' + (a.priority === p ? " selected" : "") + ">" + p + "</option>";
        }).join("") + '</select></label>' +
        '<label>Effort <select data-k="effort">' + ["S", "M", "L"].map(function (p) {
          return '<option' + (a.effort === p ? " selected" : "") + ">" + p + "</option>";
        }).join("") + "</select></label></div>" +
        '<label>Why <input data-k="why" value="' + R.esc(a.why) + '"></label>' +
        '<label>First step <input data-k="firstStep" value="' + R.esc(a.firstStep) + '"></label>' +
        '<div class="grid2"><label>Owner <input data-k="owner" value="' + R.esc(a.owner) + '"></label>' +
        '<label>Timeframe <input data-k="timeframe" value="' + R.esc(a.timeframe) + '"></label></div>' +
        '<label>Teams touched <input data-k="teams" value="' + R.esc(a.teams) + '"></label>' +
        '<label>What has to happen first <input data-k="dependsOn" value="' + R.esc(a.dependsOn) + '"></label>' +
        '<label>Expected outcome <input data-k="outcome" value="' + R.esc(a.outcome) + '"></label>' +
        "<p>Can you do this in-house?</p>" +
        '<div class="grid2">' + ["skills", "tooling", "leadership", "change"].map(function (k) {
          var label = k === "leadership" ? "Leadership time" : k === "change" ? "Change effort" : k[0].toUpperCase() + k.slice(1);
          return '<label>' + label + ' <select data-rag="' + k + '">' + ["green", "amber", "red"].map(function (c) {
            return '<option value="' + c + '"' + (a.readiness[k] === c ? " selected" : "") + ">" + c + "</option>";
          }).join("") + "</select></label>";
        }).join("") + "</div>" +
        '<div class="rowbtns"><button type="button" class="btn ghost" data-swap>Swap</button></div></article>';
    }).join("");
    $("actions").innerHTML = html || "<p class='note'>Set the five scores to get suggestions.</p>";
  }

  function renderRisks() {
    $("risks").innerHTML = (session.risks || []).map(function (r, i) {
      return '<article class="card" data-r="' + i + '">' +
        '<label>Risk <input data-k="risk" value="' + R.esc(r.risk) + '"></label>' +
        '<div class="grid2"><label>Likelihood <input data-k="likelihood" value="' + R.esc(r.likelihood) + '"></label>' +
        '<label>Impact <input data-k="impact" value="' + R.esc(r.impact) + '"></label></div>' +
        '<label>Mitigation <input data-k="mitigation" value="' + R.esc(r.mitigation) + '"></label></article>';
    }).join("") || "<p class='note'>Risks appear once the five scores are set.</p>";
  }

  function paintTimer() {
    var st = M.timerState(session.timerElapsed || 0);
    $("t-name").textContent = st.done ? "Run sheet complete" : st.section.name;
    $("t-clock").textContent = st.done ? "25:00" : M.clock(st.remaining);
    $("t-bar").innerHTML = st.sections.map(function (s) {
      return '<i class="' + s.state + '" style="flex:' + (s.seconds / 60) + '"></i>';
    }).join("");
    $("t-secs").innerHTML = st.sections.map(function (s) {
      return '<li class="' + s.state + '">' + s.name + " " + (s.seconds / 60) + "m</li>";
    }).join("");
  }

  function tick() {
    session.timerElapsed = Math.min(25 * 60, (session.timerElapsed || 0) + 1);
    paintTimer();
    if (session.timerElapsed >= 25 * 60) pause();
  }

  function start() {
    if (timerHandle) return;
    timerHandle = setInterval(tick, 1000);
    $("t-start").textContent = "Running";
  }

  function pause() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
    $("t-start").textContent = "Start";
    persist();
  }

  function highlight(text, terms) {
    var safe = R.esc(text);
    (terms || []).forEach(function (term) {
      var re = new RegExp("\\b(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "gi");
      safe = safe.replace(re, "<mark>$1</mark>");
    });
    $("highlight").innerHTML = safe ? "<p>" + safe.replace(/\n/g, "<br>") + "</p>" : "";
  }

  var LOCAL_TERMS = ["decide", "decision", "build", "copilot", "test", "testing", "regression", "release", "deploy", "measure", "adoption", "usage", "metric", "week", "weeks", "month", "stuck", "wait", "bottleneck", "flag"];

  function termsIn(text) {
    var found = [];
    LOCAL_TERMS.forEach(function (t) {
      if (new RegExp("\\b" + t + "\\b", "i").test(text)) found.push(t);
    });
    return found;
  }

  async function analyse() {
    readFields();
    persist();
    var note = $("analyse-note");
    if (!session.transcript.trim()) {
      note.textContent = "Paste a transcript first.";
      return;
    }
    note.textContent = "Checking whether AI analysis is configured…";
    var data = null;
    try {
      var res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: session.transcript })
      });
      data = await res.json();
    } catch (e) {
      data = { configured: false, message: "AI analysis not configured" };
    }
    if (!data || data.configured === false) {
      note.textContent = "AI analysis not configured. Keywords from the transcript are highlighted below. You can still type quotes and adjust scores by hand. See diagnostic-call/README.md for the env var that switches AI on.";
      highlight(session.transcript, (data && data.terms) || termsIn(session.transcript));
      $("suggest").innerHTML = "";
      return;
    }
    suggestions = data;
    note.textContent = "Suggestions are ready. Nothing is overwritten until you apply them.";
    highlight(session.transcript, []);
    var scores = data.scores || {};
    $("suggest").innerHTML =
      "<div class='card'><p><strong>Suggested scores.</strong> " +
      M.STAGES.map(function (s) { return s.name + " " + (scores[s.id] == null ? "n/a" : scores[s.id]); }).join(", ") +
      "</p><div class='rowbtns'><button class='btn' type='button' id='apply-ai'>Apply scores, notes and quotes</button></div></div>";
    $("apply-ai").onclick = applyAi;
  }

  function applyAi() {
    if (!suggestions) return;
    var scores = suggestions.scores || {};
    var notes = suggestions.notes || {};
    M.STAGES.forEach(function (s) {
      if (scores[s.id] >= 1 && scores[s.id] <= 5) {
        session.stages[s.id].score = Math.round(scores[s.id]);
        session.stages[s.id].fromIntake = false;
      }
      if (notes[s.id]) session.stages[s.id].notes = M.stripDashes(notes[s.id]);
    });
    if (suggestions.quotes && suggestions.quotes.length) {
      session.quotes = [M.stripDashes(suggestions.quotes[0] || ""), M.stripDashes(suggestions.quotes[1] || "")];
      $("q0").value = session.quotes[0];
      $("q1").value = session.quotes[1];
    }
    renderStages();
    renderAsk();
    renderSummary();
    persist();
    $("analyse-note").textContent = "Applied. Open the scorecard to regenerate it.";
  }

  function bind() {
    ["f-company", "f-person", "f-date", "f-feature", "f-cycle", "f-freq", "f-transcript", "q0", "q1"].forEach(function (id) {
      $(id).addEventListener("input", function () { readFields(); renderSummary(); persist(); });
      $(id).addEventListener("change", function () { readFields(); renderSummary(); persist(); });
    });
    $("stages").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-score]");
      if (!btn) return;
      var card = btn.closest(".stage");
      var id = card.getAttribute("data-stage");
      session.stages[id].score = Number(btn.getAttribute("data-score"));
      session.stages[id].fromIntake = false;
      card.querySelectorAll("[data-score]").forEach(function (b) { b.classList.toggle("on", b === btn); });
      var badge = card.querySelector(".badge");
      if (badge) badge.hidden = true;
      ensureSuggestions();
      renderAsk();
      renderSummary();
      if (!(session.actions || []).length) renderActions();
      persist();
    });
    $("stages").addEventListener("input", function (e) {
      var card = e.target.closest(".stage");
      if (!card) return;
      var id = card.getAttribute("data-stage");
      if (e.target.hasAttribute("data-weeks")) {
        var v = e.target.value.trim();
        session.stages[id].weeks = v === "" ? null : Number(v);
      }
      if (e.target.hasAttribute("data-notes")) session.stages[id].notes = e.target.value;
      renderSummary();
      persist();
    });
    function onActionEdit(e) {
      var card = e.target.closest(".card");
      if (!card || card.getAttribute("data-i") == null) return;
      var a = session.actions[Number(card.getAttribute("data-i"))];
      if (!a) return;
      if (e.target.hasAttribute("data-k")) a[e.target.getAttribute("data-k")] = e.target.value;
      if (e.target.hasAttribute("data-rag")) a.readiness[e.target.getAttribute("data-rag")] = e.target.value;
      renderSummary();
      persist();
    }
    $("actions").addEventListener("input", onActionEdit);
    $("actions").addEventListener("change", onActionEdit);
    $("actions").addEventListener("click", function (e) {
      if (!e.target.hasAttribute("data-swap")) return;
      var card = e.target.closest(".card");
      var i = Number(card.getAttribute("data-i"));
      var a = session.actions[i];
      var items = M.libraryItems(library, a.stage, a.level || M.levelFor(session.stages[a.stage].score || 3));
      if (!items.length) return;
      var idx = 0;
      items.forEach(function (item, n) { if (item.text === a.text) idx = n; });
      var next = items[(idx + 1) % items.length];
      next.rank = a.rank;
      next.priority = a.priority;
      session.actions[i] = next;
      renderActions();
      renderSummary();
      persist();
    });
    $("risks").addEventListener("input", function (e) {
      var card = e.target.closest(".card");
      if (!card) return;
      var r = session.risks[Number(card.getAttribute("data-r"))];
      r[e.target.getAttribute("data-k")] = e.target.value;
      persist();
    });
    $("reset-actions").onclick = function () {
      if (!M.scoresReady(session)) return;
      session.actions = M.suggestActions(session, library);
      session.risks = M.suggestRisks(session);
      renderActions();
      renderRisks();
      renderSummary();
      persist();
    };
    $("t-start").onclick = start;
    $("t-pause").onclick = pause;
    $("t-reset").onclick = function () { pause(); session.timerElapsed = 0; paintTimer(); persist(); };
    $("analyse").onclick = analyse;
    $("open-score").onclick = function () {
      readFields(); persist();
      var url = shareUrl().replace("/diagnostic-call/", "/diagnostic-call/scorecard/");
      window.open(url, "_blank");
    };
    $("copy-link").onclick = function () {
      readFields(); persist();
      navigator.clipboard.writeText(shareUrl()).then(function () {
        $("status").textContent = "Session link copied.";
      });
    };
    $("copy-email").onclick = function () {
      readFields(); persist();
      navigator.clipboard.writeText(R.emailHtml(session)).then(function () {
        $("status").textContent = "Email HTML copied. Nothing was sent.";
      });
    };
    $("new-session").onclick = function () {
      pause();
      session = M.blankSession();
      if (session.date === "") session.date = new Date().toISOString().slice(0, 10);
      fillFields();
      renderStages();
      renderAsk();
      renderActions();
      renderRisks();
      renderSummary();
      paintTimer();
      history.replaceState(null, "", "/diagnostic-call/");
      persist();
    };
  }

  async function boot() {
    try {
      var res = await fetch("/diagnostic-call/priorities.json");
      library = await res.json();
    } catch (e) {
      library = {};
    }
    session = loadSession();
    if (!session.date) session.date = new Date().toISOString().slice(0, 10);
    ensureSuggestions();
    fillFields();
    renderStages();
    renderAsk();
    renderActions();
    renderRisks();
    renderSummary();
    paintTimer();
    bind();
    persist();
  }

  boot();
})();
