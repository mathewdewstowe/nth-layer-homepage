/* Shared model for the preview diagnostic call toolkit.
   No network. No secrets. Works in the browser and in Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NthCall = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var STAGES = [
    { id: "decide", name: "Decide" },
    { id: "build", name: "Build" },
    { id: "test", name: "Test" },
    { id: "release", name: "Release" },
    { id: "measure", name: "Measure" }
  ];

  var PROMPTS = {
    decide: [
      "Who decided this was worth building, and how?",
      "What did you know about the customer before anyone started building?",
      "What would have made you stop this bet?"
    ],
    build: [
      "Where did AI coding tools actually write or change the code?",
      "How many streams was one person running at once?",
      "What slowed the build itself?"
    ],
    test: [
      "How much testing is automated?",
      "Who checked it was safe to ship?",
      "What did the last incident change in the way you test?"
    ],
    release: [
      "How did this change reach customers?",
      "What still had to be approved by hand?",
      "How long did it sit after the code was done?"
    ],
    measure: [
      "How do you know customers used it?",
      "What number moved, and who looked at it?",
      "What would you do differently on the next bet?"
    ]
  };

  var RUN = [
    { id: "opening", name: "Opening", seconds: 3 * 60 },
    { id: "trace", name: "Feature trace", seconds: 12 * 60 },
    { id: "bottleneck", name: "Bottleneck", seconds: 5 * 60 },
    { id: "priorities", name: "Priorities", seconds: 4 * 60 },
    { id: "close", name: "Close", seconds: 1 * 60 }
  ];

  var FREQ = {
    weekly: 1,
    "2-weeks": 2,
    monthly: 4.3,
    "6-weeks": 6,
    quarterly: 13,
    slower: 26,
    unsaid: null
  };

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var DEFAULTS = {
    decide: { owner: "Product manager", teams: "Product, Engineering", dependsOn: "A named owner for the bet." },
    build: { owner: "Engineering lead", teams: "Engineering", dependsOn: "An approved coding tool and a repo to use it in." },
    test: { owner: "QA or a senior engineer", teams: "Engineering, QA", dependsOn: "The three journeys customers use most." },
    release: { owner: "Head of Engineering", teams: "Engineering, Product", dependsOn: "One product area you can release on its own." },
    measure: { owner: "Product manager", teams: "Product, Engineering", dependsOn: "Agreement on one event that means the feature was used." }
  };

  var MEANING = {
    decide: [
      "Bets start without a clear owner or a customer check.",
      "Someone decides, but late, or without a cheap test of the customer.",
      "Product decides before build, with gaps.",
      "A named owner decides before real spend.",
      "A cheap customer test happens before build."
    ],
    build: [
      "AI coding tools are barely in the production path.",
      "A few people use AI coding tools. It is not the default.",
      "About half the build uses AI, with uneven review.",
      "Most of the team uses AI coding tools on real work.",
      "AI coding is the default, with a WIP limit and review."
    ],
    test: [
      "Almost nothing is automated. Safety is a late manual check.",
      "Testing is mostly manual, with thin regression cover.",
      "Some automation exists. Major changes still depend on people.",
      "Most changes have an automated check before they move.",
      "Tests, including the last incident, run on every change."
    ],
    release: [
      "Finished code waits a long time, or ships on a slow train.",
      "Release is a queue. Small changes do not have a fast path.",
      "Release is faster in places, and still gated by hand-offs.",
      "Most small changes reach customers the same week.",
      "Same-day release is normal for low-risk changes."
    ],
    measure: [
      "Nobody can tell whether customers used the feature.",
      "Success is tickets or velocity, not customer outcome.",
      "Some bets have an outcome. Most do not.",
      "Major bets are judged on revenue, retention, or cost.",
      "Every bet has a number, read while the work is still fresh."
    ]
  };

  function stageById(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
    return null;
  }

  function clampScore(n) {
    n = Math.round(Number(n));
    if (n < 1) return 1;
    if (n > 5) return 5;
    return n;
  }

  function avg(list) {
    if (!list.length) return null;
    var t = 0;
    for (var i = 0; i < list.length; i++) t += list[i];
    return t / list.length;
  }

  function draftFromIntake(answers) {
    if (!answers || answers.length !== 10) return null;
    for (var i = 0; i < answers.length; i++) {
      if (!(answers[i] >= 1 && answers[i] <= 5)) return null;
    }
    var bags = { decide: [], build: [], test: [], release: [], measure: [] };
    bags.build.push(answers[0]);
    bags.measure.push(answers[1]);
    var wait = answers[2];
    if (wait === 1) bags.decide.push(1);
    else if (wait === 2) bags.decide.push(2);
    else if (wait === 3) bags.test.push(2);
    else if (wait === 4) bags.release.push(2);
    bags.release.push(answers[3]);
    bags.measure.push(answers[4]);
    bags.test.push(answers[5]);
    bags.decide.push(answers[6]);
    bags.build.push(answers[7]);
    bags.test.push(answers[8]);
    var br = answers[9];
    if (br === 2) bags.build.push(2);
    else if (br === 3) bags.test.push(2);
    else if (br === 4) { bags.release.push(2); bags.decide.push(2); }
    var out = {};
    STAGES.forEach(function (s) {
      var a = avg(bags[s.id]);
      out[s.id] = a == null ? 3 : clampScore(a);
    });
    return out;
  }

  function weeksOf(stage) {
    if (!stage) return null;
    if (typeof stage.weeks === "number" && !isNaN(stage.weeks)) return stage.weeks;
    var notes = stage.notes || "";
    var m = /(\d+(?:\.\d+)?)\s*(week|weeks|day|days|month|months)/i.exec(notes);
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (/day/i.test(m[2])) return Math.round((n / 7) * 10) / 10;
    if (/month/i.test(m[2])) return Math.round(n * 4.3 * 10) / 10;
    return n;
  }

  function stageList(session) {
    return STAGES.map(function (s) {
      var row = (session.stages && session.stages[s.id]) || {};
      return {
        id: s.id,
        name: s.name,
        score: row.score == null ? null : clampScore(row.score),
        notes: row.notes || "",
        weeks: weeksOf(row),
        fromIntake: !!row.fromIntake
      };
    });
  }

  function scoresReady(session) {
    var rows = stageList(session);
    for (var i = 0; i < rows.length; i++) if (rows[i].score == null) return false;
    return true;
  }

  function overall(session) {
    var rows = stageList(session).filter(function (r) { return r.score != null; });
    if (rows.length !== 5) return null;
    var t = 0;
    rows.forEach(function (r) { t += r.score; });
    return Math.round((t / 5) * 10) / 10;
  }

  function lifecycle(session) {
    var ids = ["decide", "test", "release", "measure"];
    var rows = stageList(session);
    var vals = [];
    ids.forEach(function (id) {
      var row = rows.filter(function (r) { return r.id === id; })[0];
      if (row && row.score != null) vals.push(row.score);
    });
    if (vals.length !== 4) return null;
    return Math.round((avg(vals)) * 10) / 10;
  }

  function buildScore(session) {
    var row = stageList(session).filter(function (r) { return r.id === "build"; })[0];
    return row ? row.score : null;
  }

  function weakness(session) {
    var rows = stageList(session).filter(function (r) { return r.score != null; });
    var order = STAGES.map(function (s) { return s.id; });
    rows.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      var aw = a.weeks == null ? -1 : a.weeks;
      var bw = b.weeks == null ? -1 : b.weeks;
      if (aw !== bw) return bw - aw;
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
    return rows;
  }

  function bottleneck(session) {
    var rows = weakness(session);
    return rows.length ? rows[0] : null;
  }

  function quadrant(build, life) {
    if (build == null || life == null) return null;
    var hx = build >= 3;
    var hy = life >= 3;
    if (hx && hy) return { id: "ai-native", label: "AI-native" };
    if (hx && !hy) return { id: "fast-coders", label: "Fast coders, slow delivery" };
    if (!hx && hy) return { id: "process-ready", label: "Process-ready, AI-light" };
    return { id: "traditional", label: "Traditional" };
  }

  function matrixOf(session) {
    var b = buildScore(session);
    var y = lifecycle(session);
    return { build: b, lifecycle: y, quadrant: quadrant(b, y) };
  }

  function levelFor(score) {
    if (score <= 2) return "low";
    if (score === 3) return "mid";
    return "high";
  }

  function readinessOverall(r) {
    var vals = [r.skills, r.tooling, r.leadership, r.change];
    if (vals.indexOf("red") >= 0) return "red";
    if (vals.indexOf("amber") >= 0) return "amber";
    return "green";
  }

  function hydrate(item, stageId, level, index) {
    var d = DEFAULTS[stageId];
    var ready = item.readiness || (level === "high"
      ? { skills: "green", tooling: "green", leadership: "green", change: "green" }
      : level === "mid"
        ? { skills: "green", tooling: "amber", leadership: "green", change: "amber" }
        : { skills: "amber", tooling: "amber", leadership: "amber", change: "amber" });
    return {
      id: item.id || (stageId + "-" + level + "-" + index),
      stage: stageId,
      level: level,
      text: item.text,
      why: item.why || (stageById(stageId).name + " is on the list because it is where the feature slows down."),
      firstStep: item.firstStep || item.text,
      owner: item.owner || d.owner,
      outcome: item.outcome || "The stage is faster on the next feature, and you can see it.",
      timeframe: item.timeframe || (level === "low" ? "Weeks 1 to 6" : "Weeks 1 to 8"),
      teams: item.teams || d.teams,
      dependsOn: item.dependsOn || d.dependsOn,
      effort: item.effort || (level === "high" ? "S" : "M"),
      readiness: {
        skills: ready.skills,
        tooling: ready.tooling,
        leadership: ready.leadership,
        change: ready.change
      }
    };
  }

  function libraryItems(library, stageId, level) {
    var block = library && library[stageId] && library[stageId][level];
    if (!block) return [];
    return block.map(function (item, i) { return hydrate(item, stageId, level, i); });
  }

  function suggestActions(session, library) {
    if (!scoresReady(session) || !library) return [];
    var order = weakness(session);
    var used = {};
    function take(stageId, which) {
      var score = session.stages[stageId].score;
      var items = libraryItems(library, stageId, levelFor(score));
      var item = items[which] || items[0];
      if (!item) return null;
      var key = item.id;
      if (used[key]) item = items[which + 1] || items[0];
      if (!item || used[item.id]) return null;
      used[item.id] = true;
      return item;
    }
    var plan = [
      { stage: order[0].id, which: 0, priority: "High" },
      { stage: order[1].id, which: 0, priority: "High" },
      { stage: order[2].id, which: 0, priority: "High" },
      { stage: order[0].id, which: 1, priority: "Medium" },
      { stage: order[3].id, which: 0, priority: "Low" }
    ];
    var actions = [];
    plan.forEach(function (p) {
      var item = take(p.stage, p.which);
      if (!item) return;
      item.priority = p.priority;
      item.rank = actions.length + 1;
      actions.push(item);
    });
    return actions;
  }

  function suggestRisks(session) {
    var rows = {};
    stageList(session).forEach(function (r) { rows[r.id] = r; });
    if (!scoresReady(session)) return [];
    var risks = [];
    if (rows.build.score >= 4 && rows.test.score <= 2) {
      risks.push({
        risk: "Quality debt from AI-written code",
        likelihood: "High",
        impact: "High",
        mitigation: "Automate regression on the top customer journeys before the coding pace gets faster."
      });
    }
    if (rows.release.score <= 2) {
      risks.push({
        risk: "Release bottleneck eroding AI ROI",
        likelihood: "High",
        impact: "High",
        mitigation: "Give one product area a weekly path so finished code does not sit for weeks."
      });
    }
    if (rows.measure.score <= 3) {
      risks.push({
        risk: "No adoption measurement",
        likelihood: "Medium",
        impact: "High",
        mitigation: "Attach one usage event to each feature and read it two weeks after release."
      });
    }
    if (rows.decide.score <= 2) {
      risks.push({
        risk: "Bets start before a customer check",
        likelihood: "Medium",
        impact: "Medium",
        mitigation: "Run one cheap customer check before a build ticket is opened."
      });
    }
    if (rows.test.score <= 2 && risks.length < 4) {
      risks.push({
        risk: "Defects found after customers already have the change",
        likelihood: "Medium",
        impact: "High",
        mitigation: "Block release when the top journey tests are red."
      });
    }
    return risks.slice(0, 4);
  }

  function targetStages(session) {
    var copy = {};
    STAGES.forEach(function (s) {
      copy[s.id] = session.stages[s.id].score;
    });
    var tops = (session.actions || []).filter(function (a) { return a.rank <= 3; });
    tops.forEach(function (a) {
      if (copy[a.stage] != null) copy[a.stage] = Math.min(5, copy[a.stage] + 1);
    });
    var fake = blankSession();
    STAGES.forEach(function (s) { fake.stages[s.id].score = copy[s.id]; });
    return { scores: copy, matrix: matrixOf(fake) };
  }

  function formatWeeks(n) {
    if (n == null) return "no data";
    var v = Math.round(n * 10) / 10;
    var label = String(v).replace(/\.0$/, "");
    return label + (v === 1 ? " week" : " weeks");
  }

  function costOfDelay(session) {
    var rel = weeksOf(session.stages && session.stages.release);
    if (rel == null) {
      return {
        text: "Release time was not captured, so the cost of delay is not estimated.",
        estimate: true
      };
    }
    var freq = FREQ[session.releaseFrequency];
    var known = [];
    STAGES.forEach(function (s) {
      var w = weeksOf(session.stages[s.id]);
      if (w != null) known.push(w);
    });
    var cycle = freq || (known.length ? known.reduce(function (a, b) { return a + b; }, 0) : null);
    if (!cycle) {
      return {
        text: "Each feature waits " + formatWeeks(rel) + " for release. The yearly cost needs a cycle time or a release frequency.",
        estimate: true
      };
    }
    var months = (rel * (52 / cycle)) / 4.345;
    var pretty = (Math.round(months * 2) / 2).toString().replace(/\.0$/, "");
    var unit = pretty === "1" ? "month" : "months";
    return {
      text: "Each feature waits " + formatWeeks(rel) + " for release: roughly " + pretty + " " + unit + " of customer value lost per year.",
      estimate: true,
      months: Math.round(months * 10) / 10
    };
  }

  function bottleneckWhy(session) {
    var b = bottleneck(session);
    if (!b) return "";
    var w = b.weeks;
    var heard = b.notes ? " What we heard: " + b.notes : "";
    if (w != null) {
      return b.name + " is the lowest score, and it is where the traced feature waited longest (" + formatWeeks(w) + ")." + heard;
    }
    return b.name + " is the lowest score. No duration was captured for that stage." + heard;
  }

  function quadrantPhrase(q) {
    if (!q) return "not yet placed on the matrix";
    if (q.id === "fast-coders") return "writing code with AI faster than the rest of the lifecycle can absorb";
    if (q.id === "traditional") return "early on both AI coding and the path to customers";
    if (q.id === "process-ready") return "further along the path to customers, and still light on AI in the build";
    return "keeping the whole path in step with AI coding";
  }

  function executiveSummary(session) {
    var name = session.company || "This company";
    var o = overall(session);
    var life = lifecycle(session);
    var bld = buildScore(session);
    var q = matrixOf(session).quadrant;
    var b = bottleneck(session);
    var tops = (session.actions || []).filter(function (a) { return a.rank <= 3; }).map(function (a) { return a.text.replace(/\.$/, "") });
    var lines = [];
    lines.push(name + " is " + quadrantPhrase(q) + ".");
    if (o != null) {
      lines.push("Overall maturity is " + o.toFixed(1) + " out of 5: Build is " + bld + ", while Decide, Test, Release and Measure average " + life.toFixed(1) + ".");
    }
    if (b) {
      var wait = b.weeks != null ? " The traced feature waited " + formatWeeks(b.weeks) + " there." : "";
      lines.push("The bottleneck is " + b.name + "." + wait);
    }
    if (tops.length) {
      lines.push("The first moves for the next 90 days are " + tops.join("; ") + ".");
    }
    return lines.join(" ");
  }

  function findingMeaning(stageId, score) {
    if (score == null) return "Score not set.";
    return MEANING[stageId][score - 1];
  }

  function whatGoodLooksLike() {
    return "AI-native means the path keeps up with the coding. A bet has an owner and a customer check before build. Tests run on every change. A small change reaches customers the same week, often behind a flag. Each feature has one adoption number, read while the work is still fresh.";
  }

  function formatDate(iso) {
    if (!iso) return "Date not set";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }

  function blankStage() {
    return { score: null, notes: "", weeks: null, fromIntake: false };
  }

  function blankSession() {
    var stages = {};
    STAGES.forEach(function (s) { stages[s.id] = blankStage(); });
    return {
      v: 1,
      id: "s" + Math.random().toString(36).slice(2, 8),
      company: "",
      person: "",
      date: "",
      feature: "",
      cycleTime: "",
      releaseFrequency: "unsaid",
      intake: null,
      stages: stages,
      actions: [],
      risks: [],
      quotes: ["", ""],
      transcript: "",
      timerElapsed: 0,
      example: false
    };
  }

  function applyDraft(session, draft) {
    STAGES.forEach(function (s) {
      session.stages[s.id].score = draft[s.id];
      session.stages[s.id].fromIntake = true;
    });
    return session;
  }

  function exampleSession() {
    var s = blankSession();
    s.id = "example-acme";
    s.example = true;
    s.company = "Acme Software (example)";
    s.person = "Jane Smith (example)";
    s.date = "2026-11-18";
    s.feature = "CSV export for account admins";
    s.cycleTime = "16 weeks";
    s.releaseFrequency = "unsaid";
    s.timerElapsed = 8 * 60 + 40;
    s.stages.decide = { score: 2, weeks: 5, fromIntake: false, notes: "Product and sales agreed the export was needed. No customer interview. It sat in the backlog for five weeks." };
    s.stages.build = { score: 4, weeks: 2, fromIntake: false, notes: "Two engineers used Copilot daily. The code itself took two weeks." };
    s.stages.test = { score: 2, weeks: 3, fromIntake: false, notes: "Manual checks on the happy path. No automated regression. QA is one person." };
    s.stages.release = { score: 1, weeks: 6, fromIntake: false, notes: "The change waited six weeks for a monthly release train and a sign-off meeting." };
    s.stages.measure = { score: 3, weeks: null, fromIntake: false, notes: "No usage event. They will know it worked if nobody complains." };
    s.actions = [
      hydrate({
        id: "ex-1",
        text: "Ship weekly behind feature flags",
        why: "Release is 1 of 5, and the traced feature waited 6 weeks after the code was done.",
        firstStep: "Pick the admin export and release it every week behind a flag.",
        owner: "Head of Engineering",
        outcome: "A small change reaches customers the same week it is finished.",
        timeframe: "Weeks 1 to 4",
        teams: "Engineering, Product",
        dependsOn: "A flag already in the app, or one day to add one.",
        effort: "M",
        readiness: { skills: "amber", tooling: "green", leadership: "amber", change: "amber" }
      }, "release", "low", 0),
      hydrate({
        id: "ex-2",
        text: "Automate regression on the top 3 journeys",
        why: "Test is 2 of 5, so faster coding is not checked before release.",
        firstStep: "Name the three admin journeys and record a passing automated test for each.",
        owner: "QA or a senior engineer",
        outcome: "Those journeys fail the build instead of failing in front of customers.",
        timeframe: "Weeks 2 to 8",
        teams: "Engineering, QA",
        dependsOn: "A list of the three journeys from support or product.",
        effort: "M",
        readiness: { skills: "amber", tooling: "amber", leadership: "green", change: "amber" }
      }, "test", "low", 0),
      hydrate({
        id: "ex-3",
        text: "Attach one adoption metric to each feature",
        why: "Measure is 3 of 5, and this export has no usage number.",
        firstStep: "Add one 'export completed' event before the feature is called done.",
        owner: "Product manager",
        outcome: "Each new feature has a number you can read two weeks after release.",
        timeframe: "Weeks 1 to 6",
        teams: "Product, Engineering",
        dependsOn: "Agreement on the event name and where it is read.",
        effort: "S",
        readiness: { skills: "green", tooling: "green", leadership: "amber", change: "green" }
      }, "measure", "mid", 0),
      hydrate({
        id: "ex-4",
        text: "Run one customer check before a build ticket is opened",
        why: "Decide is 2 of 5. This bet started from an internal request, not a customer check.",
        firstStep: "Talk to five account admins before the next export-sized bet is opened.",
        owner: "Product manager",
        outcome: "The next bet has a customer signal before engineering time is spent.",
        timeframe: "Weeks 1 to 4",
        teams: "Product",
        dependsOn: "Access to five customers or admins.",
        effort: "S",
        readiness: { skills: "green", tooling: "green", leadership: "amber", change: "amber" }
      }, "decide", "low", 0),
      hydrate({
        id: "ex-5",
        text: "Cap each senior at three agent streams until review keeps up",
        why: "Build is already fast. More parallel AI streams will pile work onto test and release.",
        firstStep: "Set a WIP limit of three open streams per senior for this quarter.",
        owner: "Engineering lead",
        outcome: "Coding speed stops outrunning review.",
        timeframe: "Weeks 1 to 2",
        teams: "Engineering",
        dependsOn: "A visible board of open streams.",
        effort: "S",
        readiness: { skills: "green", tooling: "green", leadership: "amber", change: "amber" }
      }, "build", "high", 0)
    ];
    s.actions.forEach(function (a, i) {
      a.rank = i + 1;
      a.priority = i < 3 ? "High" : (i === 3 ? "Medium" : "Low");
    });
    s.risks = [
      { risk: "Quality debt from AI-written code", likelihood: "High", impact: "High", mitigation: "Automate regression on the top 3 journeys before the weekly flag path speeds up." },
      { risk: "Release bottleneck eroding AI ROI", likelihood: "High", impact: "High", mitigation: "Weekly releases behind flags for one product area, so finished code does not sit for a month." },
      { risk: "No adoption measurement", likelihood: "Medium", impact: "High", mitigation: "One usage event on each feature, read two weeks after release." },
      { risk: "Bets start before a customer check", likelihood: "Medium", impact: "Medium", mitigation: "A short customer check before a build ticket is opened." }
    ];
    s.quotes = [
      "We can write the code in days now. It still sits for a month before customers see it.",
      "I could not tell you if anyone used the last feature."
    ];
    s.transcript = "Jane Smith: We can write the code in days now. It still sits for a month before customers see it.\nJane Smith: I could not tell you if anyone used the last feature.\nThe export waited six weeks for the monthly release. Testing was a manual pass. Copilot wrote a lot of the build.";
    return s;
  }

  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64ToUtf8(code) {
    var s = code.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeSession(session) {
    return utf8ToB64(JSON.stringify(session));
  }

  function decodeSession(code) {
    var data = JSON.parse(b64ToUtf8(code));
    var base = blankSession();
    Object.keys(base).forEach(function (k) {
      if (data[k] !== undefined) base[k] = data[k];
    });
    STAGES.forEach(function (s) {
      base.stages[s.id] = Object.assign(blankStage(), (data.stages && data.stages[s.id]) || {});
    });
    base.quotes = (data.quotes || ["", ""]).slice(0, 2);
    while (base.quotes.length < 2) base.quotes.push("");
    return base;
  }

  function timerState(elapsed) {
    var t = Math.max(0, elapsed | 0);
    var acc = 0;
    var current = RUN[RUN.length - 1];
    var into = 0;
    var done = false;
    if (t >= 25 * 60) {
      done = true;
      into = current.seconds;
    } else {
      for (var i = 0; i < RUN.length; i++) {
        if (t < acc + RUN[i].seconds) {
          current = RUN[i];
          into = t - acc;
          break;
        }
        acc += RUN[i].seconds;
      }
    }
    return {
      elapsed: t,
      section: current,
      into: into,
      remaining: current.seconds - into,
      done: done,
      sections: RUN.map(function (sec) {
        var start = 0;
        for (var i = 0; i < RUN.length; i++) {
          if (RUN[i].id === sec.id) break;
          start += RUN[i].seconds;
        }
        var state = t >= start + sec.seconds ? "done" : (t >= start ? "now" : "later");
        if (done && sec.id === "close") state = "done";
        return { id: sec.id, name: sec.name, seconds: sec.seconds, state: state };
      })
    };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(sec) {
    sec = Math.max(0, sec | 0);
    return pad((sec / 60) | 0) + ":" + pad(sec % 60);
  }

  function stripDashes(s) {
    return String(s || "").replace(/\u2014/g, ",").replace(/\u2013/g, "-");
  }

  return {
    STAGES: STAGES,
    PROMPTS: PROMPTS,
    RUN: RUN,
    FREQ: FREQ,
    draftFromIntake: draftFromIntake,
    stageList: stageList,
    scoresReady: scoresReady,
    overall: overall,
    lifecycle: lifecycle,
    buildScore: buildScore,
    bottleneck: bottleneck,
    weakness: weakness,
    quadrant: quadrant,
    matrixOf: matrixOf,
    levelFor: levelFor,
    weeksOf: weeksOf,
    formatWeeks: formatWeeks,
    suggestActions: suggestActions,
    suggestRisks: suggestRisks,
    targetStages: targetStages,
    costOfDelay: costOfDelay,
    bottleneckWhy: bottleneckWhy,
    executiveSummary: executiveSummary,
    findingMeaning: findingMeaning,
    whatGoodLooksLike: whatGoodLooksLike,
    formatDate: formatDate,
    blankSession: blankSession,
    applyDraft: applyDraft,
    exampleSession: exampleSession,
    encodeSession: encodeSession,
    decodeSession: decodeSession,
    timerState: timerState,
    clock: clock,
    readinessOverall: readinessOverall,
    hydrate: hydrate,
    libraryItems: libraryItems,
    stripDashes: stripDashes
  };
});
