/* Renders the 2-page scorecard and the email HTML body. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NthReport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  var hasModule = typeof module === "object" && module.exports;
  var M = hasModule ? require("./model.js") : root.NthCall;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function logo() {
    return '<svg class="mark" viewBox="0 0 80 80" fill="none" aria-hidden="true"><rect x="2" y="2" width="76" height="76" stroke="currentColor" stroke-width="4"/><rect x="14" y="14" width="52" height="52" stroke="currentColor" stroke-width="4"/><rect x="26" y="26" width="28" height="28" stroke="currentColor" stroke-width="4"/><rect x="35" y="35" width="10" height="10" fill="currentColor"/></svg>';
  }

  function dialSvg(score) {
    var pct = score == null ? 0 : Math.max(0, Math.min(100, (score / 5) * 100));
    var shown = score == null ? "n/a" : score.toFixed(1);
    return '' +
      '<svg class="dial" viewBox="0 0 200 124" role="img" aria-label="Overall maturity ' + esc(shown) + ' out of 5">' +
      '<path d="M20 104 A80 80 0 0 1 180 104" fill="none" stroke="#ececec" stroke-width="14" stroke-linecap="round" pathLength="100"/>' +
      '<path d="M20 104 A80 80 0 0 1 180 104" fill="none" stroke="#141414" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="' + pct + ' 100"/>' +
      '<text x="100" y="96" text-anchor="middle" font-size="34" font-weight="700" fill="#141414">' + esc(shown) + '</text>' +
      '<text x="100" y="116" text-anchor="middle" font-size="11" fill="#444">out of 5</text>' +
      '</svg>';
  }

  function xy(score, origin, size) {
    return origin + ((Number(score) - 1) / 4) * size;
  }

  function matrixSvg(session, opts) {
    opts = opts || {};
    var live = M.matrixOf(session);
    var target = M.scoresReady(session) ? M.targetStages(session).matrix : null;
    var w = 360, h = 292;
    var l = 46, t = 18, pw = 292, ph = 220;
    function cell(x, y, text) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="9" fill="#6a6a6a">' + esc(text) + '</text>';
    }
    var midX = l + pw / 2;
    var midY = t + ph / 2;
    var dots = "";
    if (live.build != null && live.lifecycle != null) {
      var x = xy(live.build, l, pw);
      var y = t + ph - xy(live.lifecycle, 0, ph);
      dots += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#141414"/>';
      dots += '<text x="' + (x + 10) + '" y="' + (y - 8) + '" font-size="9" font-weight="700" fill="#141414">Today</text>';
    }
    if (target && target.build != null) {
      var tx = xy(target.build, l, pw);
      var ty = t + ph - xy(target.lifecycle, 0, ph);
      dots += '<circle cx="' + tx + '" cy="' + ty + '" r="7" fill="none" stroke="#141414" stroke-opacity="0.45" stroke-width="2"/>';
      dots += '<text x="' + (tx + 10) + '" y="' + (ty + 14) + '" font-size="9" fill="#666">90 days</text>';
    }
    var q = live.quadrant ? live.quadrant.label : "Set all five scores";
    return '' +
      '<figure class="matrix">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="AI maturity matrix. ' + esc(q) + '">' +
      '<rect x="' + l + '" y="' + t + '" width="' + pw + '" height="' + ph + '" fill="#fff" stroke="#141414" stroke-width="1"/>' +
      '<line x1="' + midX + '" y1="' + t + '" x2="' + midX + '" y2="' + (t + ph) + '" stroke="#dedede"/>' +
      '<line x1="' + l + '" y1="' + midY + '" x2="' + (l + pw) + '" y2="' + midY + '" stroke="#dedede"/>' +
      cell(l + pw * 0.25, t + 22, "Process-ready, AI-light") +
      cell(l + pw * 0.75, t + 22, "AI-native") +
      cell(l + pw * 0.25, t + ph - 12, "Traditional") +
      cell(l + pw * 0.75, t + ph - 12, "Fast coders, slow delivery") +
      dots +
      '<text x="' + (l + pw / 2) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#141414">AI adoption in build</text>' +
      '<text x="14" y="' + (t + ph / 2) + '" text-anchor="middle" font-size="10" fill="#141414" transform="rotate(-90 14 ' + (t + ph / 2) + ')">Lifecycle readiness</text>' +
      '</svg>' +
      (opts.caption === false ? "" : '<figcaption>Quadrant: <strong>' + esc(q) + '</strong>. Hollow dot: where the top 3 priorities move you in 90 days.</figcaption>') +
      '</figure>';
  }

  function barsHtml(session) {
    var b = M.bottleneck(session);
    return '<ul class="bars">' + M.stageList(session).map(function (r) {
      var hot = b && r.id === b.id;
      var width = r.score == null ? 0 : (r.score / 5) * 100;
      return '<li class="' + (hot ? "hot" : "") + '">' +
        '<span class="nm">' + esc(r.name) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + width + '%"></span></span>' +
        '<span class="sc">' + (r.score == null ? "n/a" : r.score) + '</span>' +
        '</li>';
    }).join("") + '</ul>';
  }

  function timelineHtml(session) {
    var rows = M.stageList(session);
    var known = rows.filter(function (r) { return r.weeks != null; });
    var total = known.reduce(function (a, r) { return a + r.weeks; }, 0) || 1;
    var b = M.bottleneck(session);
    var segs = rows.map(function (r) {
      if (r.weeks == null) {
        return '<div class="seg none"><b>' + esc(r.name) + '</b><span>no data</span></div>';
      }
      var hot = b && r.id === b.id;
      return '<div class="seg' + (hot ? " hot" : "") + '" style="flex:' + (r.weeks / total) + '"><b>' + esc(r.name) + '</b><span>' + esc(M.formatWeeks(r.weeks)) + '</span></div>';
    }).join("");
    return '<div class="time"><div class="segs">' + segs + '</div></div>';
  }

  function rag(v) {
    var label = v === "red" ? "Red" : v === "green" ? "Green" : "Amber";
    return '<span class="rag rag-' + esc(v || "amber") + '">' + label + '</span>';
  }

  function footer() {
    return '<footer class="rep-foot">' +
      '<p>No deck. You keep the scorecard whether we work together or not.</p>' +
      '<p><a href="https://nthlayer.co.uk/">nthlayer.co.uk</a> · <a href="https://nthlayer.co.uk/white-paper/Nth-Layer-AI-Native-SDLC-White-Paper.pdf">White paper</a></p>' +
      '</footer>';
  }

  function render(session) {
    var person = session.person || "Name not set";
    var company = session.company || "Company not set";
    var date = M.formatDate(session.date);
    var o = M.overall(session);
    var b = M.bottleneck(session);
    var cost = session.costOverride || M.costOfDelay(session).text;
    var actions = (session.actions || []).slice().sort(function (a, c) { return a.rank - c.rank; });
    var tops = actions.filter(function (a) { return a.rank <= 3; });
    var quotes = (session.quotes || []).map(function (q) { return String(q || "").trim(); }).filter(Boolean).slice(0, 2);
    var example = session.example ? '<span class="ex">Example</span>' : "";

    var findings = M.stageList(session).map(function (r) {
      var hot = b && r.id === b.id ? " hot" : "";
      return '<tr class="' + hot + '"><th>' + esc(r.name) + '</th><td>' + (r.score == null ? "n/a" : r.score) + '</td><td>' + esc(r.notes || "Not captured in the call.") + '</td><td>' + esc(M.findingMeaning(r.id, r.score)) + '</td></tr>';
    }).join("");

    var actionRows = actions.map(function (a) {
      var top = a.rank <= 3 ? " top" : "";
      return '<tr class="' + top + '">' +
        '<td>' + a.rank + '</td>' +
        '<td><strong>' + esc(a.text) + '</strong><br><span class="sub">' + esc(a.why) + '</span></td>' +
        '<td>' + esc(a.priority) + '</td>' +
        '<td>' + esc(a.effort) + '</td>' +
        '<td>' + esc(a.owner) + '<br><span class="sub">' + esc(a.timeframe) + '</span></td>' +
        '<td>' + esc(a.firstStep) + '<br><span class="sub">Teams: ' + esc(a.teams) + '. First: ' + esc(a.dependsOn) + '</span><br><span class="sub">' + esc(a.outcome) + '</span></td>' +
        '</tr>';
    }).join("");

    var ready = tops.map(function (a) {
      var overall = M.readinessOverall(a.readiness || {});
      return '<div class="rcard"><p class="rk">' + a.rank + '. ' + esc(a.text) + '</p>' +
        '<p>Skills ' + rag(a.readiness.skills) + ' · Tooling ' + rag(a.readiness.tooling) + ' · Leadership time ' + rag(a.readiness.leadership) + ' · Change effort ' + rag(a.readiness.change) + '</p>' +
        '<p>In-house readiness: ' + rag(overall) + '</p></div>';
    }).join("");

    var risks = (session.risks || []).map(function (r) {
      return '<tr><td>' + esc(r.risk) + '</td><td>' + esc(r.likelihood) + '</td><td>' + esc(r.impact) + '</td><td>' + esc(r.mitigation) + '</td></tr>';
    }).join("");

    var quoteHtml = quotes.length
      ? quotes.map(function (q) { return '<blockquote>“' + esc(q) + '”</blockquote>'; }).join("")
      : '<p class="muted">No client quotes captured. Add a transcript later if you want lines from the call.</p>';

    var page1 = '' +
      '<article class="page" id="page-1">' +
      '<header class="mast">' +
      '<div class="brand">' + logo() + '<span>The<br>Nth<br>Layer</span>' + example + '</div>' +
      '<h1>AI-Native SDLC Diagnostic</h1>' +
      '<p class="for">Prepared for ' + esc(person) + ', ' + esc(company) + '</p>' +
      '<p class="meta">Date conducted: ' + esc(date) + '<br>Prepared by Matthew Dewstowe, Nth Layer</p>' +
      (session.example ? '<p class="exnote">Fictional data for layout review. Not a real client.</p>' : '') +
      '</header>' +
      '<section><h2>Executive summary</h2><p>' + esc(M.executiveSummary(session)) + '</p></section>' +
      '<div class="split"><div><h2>Overall maturity</h2>' + dialSvg(o) + '</div><div><h2>AI maturity matrix</h2>' + matrixSvg(session) + '</div></div>' +
      '<section><h2>Stage scores</h2><p class="muted">Lime marks the bottleneck.</p>' + barsHtml(session) + '</section>' +
      footer() +
      '</article>';

    var page2 = '' +
      '<article class="page" id="page-2">' +
      '<header class="mast slim"><div class="brand">' + logo() + '<span>The Nth Layer</span></div><p class="meta">' + esc(company) + ' · ' + esc(person) + ' · Page 2</p></header>' +
      '<section><h2>Idea to customer' + (session.feature ? ': ' + esc(session.feature) : '') + '</h2>' +
      (session.cycleTime ? '<p class="muted">Captured cycle time: ' + esc(session.cycleTime) + '</p>' : '') +
      timelineHtml(session) + '</section>' +
      '<section><h2>What we heard</h2><table class="find"><thead><tr><th>Stage</th><th>Score</th><th>What we heard</th><th>What it means</th></tr></thead><tbody>' + findings + '</tbody></table></section>' +
      '<section class="callout"><h2>Biggest bottleneck</h2><p>' + esc(M.bottleneckWhy(session)) + '</p></section>' +
      '<section><h2>Prioritised actions</h2><p class="muted">Rows 1 to 3 are the 90-day priorities. Effort is S, M, or L. This is the what, not a how-to playbook.</p>' +
      '<table class="acts"><thead><tr><th>#</th><th>Action</th><th>Priority</th><th>Effort</th><th>Owner</th><th>First step, teams, outcome</th></tr></thead><tbody>' + actionRows + '</tbody></table></section>' +
      '<section><h2>Can you do this in-house?</h2><div class="readies">' + ready + '</div></section>' +
      '<section><h2>Key risks</h2><table class="risks"><thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>' + risks + '</tbody></table></section>' +
      '<p class="cost"><strong>Cost of delay.</strong> ' + esc(cost) + ' Estimate based on what was said in the call.</p>' +
      '<section><h2>What good looks like</h2><p>' + esc(M.whatGoodLooksLike()) + '</p></section>' +
      '<section><h2>In their words</h2>' + quoteHtml + '</section>' +
      '<section><h2>Next steps</h2><p>Confirm the three 90-day priorities and name an owner for each. Start with the release wait on one product area. Add the transcript later if you want the quotes locked to this scorecard.</p></section>' +
      '<section class="close"><p>You now know what to fix. The question is whether you have the time, skills and focus to change the lifecycle while still shipping the roadmap. If not, that is where I help.</p>' +
      '<h2>90-day pilot with Nth Layer</h2>' +
      '<p>We take the bottleneck on this page and run it on one product area, with your team, until a small change reaches customers every week and you can see whether customers used it. You keep this scorecard either way.</p>' +
      '<p><a href="https://nthlayer.co.uk/">Book a call at nthlayer.co.uk</a></p></section>' +
      footer() +
      '</article>';

    return page1 + page2;
  }

  function emailHtml(session) {
    var o = M.overall(session);
    var q = M.matrixOf(session).quadrant;
    var rows = M.stageList(session).map(function (r) {
      return '<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">' + esc(r.name) + '</td><td style="padding:4px 8px;border-bottom:1px solid #eee">' + (r.score == null ? "" : r.score) + ' / 5</td></tr>';
    }).join("");
    var acts = (session.actions || []).filter(function (a) { return a.rank <= 3; }).map(function (a) {
      return '<li style="margin:0 0 6px"><strong>' + a.rank + '. ' + esc(a.text) + '</strong> (' + esc(a.priority) + ', effort ' + esc(a.effort) + ')</li>';
    }).join("");
    var cost = session.costOverride || M.costOfDelay(session).text;
    return '' +
      '<div style="background:#fff;color:#141414;font-family:Manrope,Arial,sans-serif;font-size:15px;line-height:1.45;padding:8px">' +
      '<p style="margin:0 0 8px"><strong>The Nth Layer</strong> · AI-Native SDLC Diagnostic</p>' +
      '<p style="margin:0 0 8px">Prepared for ' + esc(session.person || "") + ', ' + esc(session.company || "") + '<br>Date conducted: ' + esc(M.formatDate(session.date)) + '<br>Prepared by Matthew Dewstowe, Nth Layer</p>' +
      '<p style="margin:0 0 8px">' + esc(M.executiveSummary(session)) + '</p>' +
      '<p style="margin:0 0 8px"><strong>Overall ' + (o == null ? "n/a" : o.toFixed(1)) + ' / 5.</strong> Quadrant: ' + esc(q ? q.label : "n/a") + '.</p>' +
      '<table style="border-collapse:collapse;margin:0 0 12px">' + rows + '</table>' +
      '<p style="margin:0 0 4px"><strong>90-day priorities</strong></p><ol style="margin:0 0 12px;padding-left:18px">' + acts + '</ol>' +
      '<p style="margin:0 0 8px">' + esc(cost) + ' Estimate based on what was said in the call.</p>' +
      '<p style="margin:0 0 8px">You now know what to fix. The question is whether you have the time, skills and focus to change the lifecycle while still shipping the roadmap. If not, that is where I help.</p>' +
      '<p style="margin:0 0 8px"><a href="https://nthlayer.co.uk/" style="color:#1F4BFF">Book a call at nthlayer.co.uk</a></p>' +
      '<p style="margin:0;color:#333">No deck. You keep the scorecard whether we work together or not.<br><a href="https://nthlayer.co.uk/" style="color:#1F4BFF">nthlayer.co.uk</a> · <a href="https://nthlayer.co.uk/white-paper/Nth-Layer-AI-Native-SDLC-White-Paper.pdf" style="color:#1F4BFF">White paper</a></p>' +
      '</div>';
  }

  return {
    render: render,
    emailHtml: emailHtml,
    dialSvg: dialSvg,
    matrixSvg: matrixSvg,
    barsHtml: barsHtml,
    timelineHtml: timelineHtml,
    logo: logo,
    esc: esc
  };
});
