(function () {
  var Q = window.NthDiagnostic.questions;
  var M = window.NthCall;
  var R = window.NthReport;
  var step = 0;
  var answers = [];
  var app = document.getElementById("app");

  function paint() {
    if (step >= Q.length) return finish();
    var q = Q[step];
    app.innerHTML =
      "<p class='note'>Question " + (step + 1) + " of " + Q.length + ". Same 10 as the warm-up. About two minutes.</p>" +
      "<h1>" + R.esc(q.prompt) + "</h1>" +
      q.options.map(function (label, i) {
        return '<button class="opt" type="button" data-n="' + (i + 1) + '">' + R.esc(label) + "</button>";
      }).join("") +
      (step ? '<p><button class="btn ghost" type="button" id="back">Back</button></p>' : "");
  }

  function finish() {
    var draft = M.draftFromIntake(answers);
    var session = M.blankSession();
    session.date = new Date().toISOString().slice(0, 10);
    session.intake = answers.slice();
    M.applyDraft(session, draft);
    var fake = session;
    var code = M.encodeSession(fake);
    var href = "/diagnostic-call/?d=" + code;
    localStorage.setItem("nth-dx:" + session.id, JSON.stringify(session));
    localStorage.setItem("nth-dx:latest", session.id);
    var rows = M.stageList(session).map(function (r) {
      return "<li><strong>" + r.name + "</strong> " + r.score + " of 5</li>";
    }).join("");
    app.innerHTML =
      "<h1>Draft for the call</h1>" +
      "<p>These scores prefill the call tool. Matthew confirms them on the call. They are a draft, not the scorecard.</p>" +
      "<ul>" + rows + "</ul>" +
      "<p><strong>Quadrant:</strong> " + R.esc(M.matrixOf(session).quadrant.label) + "</p>" +
      R.matrixSvg(session) +
      "<div class='rowbtns'><a class='btn' href='" + href + "'>Open the call tool</a></div>" +
      "<p class='note'>Session code</p><textarea id='code' rows='3' readonly>" + R.esc(code) + "</textarea>" +
      "<p><button class='btn ghost' type='button' id='copy'>Copy session link</button></p>" +
      "<p id='status' class='status'></p>";
    document.getElementById("copy").onclick = function () {
      navigator.clipboard.writeText(location.origin + href).then(function () {
        document.getElementById("status").textContent = "Link copied.";
      });
    };
  }

  app.addEventListener("click", function (e) {
    if (e.target.id === "back") {
      step = Math.max(0, step - 1);
      answers.pop();
      paint();
      return;
    }
    if (!e.target.hasAttribute("data-n")) return;
    answers[step] = Number(e.target.getAttribute("data-n"));
    step += 1;
    paint();
  });

  paint();
})();
