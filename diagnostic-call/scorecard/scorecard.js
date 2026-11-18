(function () {
  var M = window.NthCall;
  var R = window.NthReport;
  var q = new URLSearchParams(location.search);
  var session = null;
  if (q.get("demo") === "1") session = M.exampleSession();
  else if (q.get("d")) {
    try { session = M.decodeSession(q.get("d")); } catch (e) { session = null; }
  } else if (q.get("s")) {
    var raw = localStorage.getItem("nth-dx:" + q.get("s"));
    if (raw) session = JSON.parse(raw);
  } else {
    var id = localStorage.getItem("nth-dx:latest");
    if (id) {
      var latest = localStorage.getItem("nth-dx:" + id);
      if (latest) session = JSON.parse(latest);
    }
  }
  var root = document.getElementById("pages");
  if (!session) {
    root.innerHTML = '<div class="empty"><h1>No session yet</h1><p>Run the intake or open the call tool, then come back. Nothing is stored on a server.</p><p><a href="/diagnostic-call/">Open the call tool</a></p></div>';
    return;
  }
  root.innerHTML = R.render(session);
  document.getElementById("print").onclick = function () { window.print(); };
  document.getElementById("email").onclick = function () {
    navigator.clipboard.writeText(R.emailHtml(session)).then(function () {
      document.getElementById("email").textContent = "Copied. Nothing was sent.";
    });
  };
})();
