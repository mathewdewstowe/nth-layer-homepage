/* Preview scoring for the AI-Native Readiness Diagnostic.
   A = 1, B = 2, C = 3, D = 4, E = 5. Ten answers, max 50.
   A fix is shown when that answer is 1, 2, or 3. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NthDiagnostic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var questions = [
    {
      label: "AI coding use",
      prompt: "How much of engineering already uses AI coding tools?",
      options: [
        "Under 10%",
        "Under 25%",
        "About half",
        "Most of the team",
        "Nearly everyone, daily"
      ],
      fix: "Roll out one approved coding stack to every squad this quarter, with a shared prompt pack and a weekly usage check."
    },
    {
      label: "Speed to customers",
      prompt: "Since adopting AI tools, how much sooner do customers get new value?",
      options: [
        "No clear change",
        "Slightly faster in pockets",
        "A bit faster overall",
        "Materially faster, we can show it",
        "Materially faster across most products"
      ],
      fix: "Pick one release train and measure days from merge to customer-visible value. Publish that number every sprint."
    },
    {
      label: "Where work waits",
      prompt: "Where does finished work wait longest?",
      options: [
        "Before anyone starts",
        "Before build (spec, prioritisation)",
        "In review or test",
        "In release or sign-off",
        "Rarely waits; flow is steady"
      ],
      fix: "Map the last 20 tickets to wait stages. Kill or automate the stage that ate the most calendar days."
    },
    {
      label: "Small changes live",
      prompt: "How often does a small, low-risk change go live?",
      options: [
        "Monthly or slower",
        "Weekly",
        "A few times a week",
        "Most days",
        "Same day is normal"
      ],
      fix: "Open a same-day path for changes under a clear risk bar (tests green, no schema, no PII)."
    },
    {
      label: "How spend is judged",
      prompt: "How is last quarter's product spend judged?",
      options: [
        "Tickets closed only",
        "Tickets and velocity",
        "Mix of activity and outcomes",
        "Outcomes for major bets",
        "Revenue, retention, or cost per bet"
      ],
      fix: "Score every bet on revenue, retention, or cost. Drop velocity as the main success metric."
    },
    {
      label: "Security checks",
      prompt: "When is security and compliance checked?",
      options: [
        "After release, if at all",
        "Late, near release",
        "On major changes",
        "On most changes",
        "Built into the spec and every change"
      ],
      fix: "Move the compliance checklist into the spec template and block merge until it passes on every change."
    },
    {
      label: "Worth building",
      prompt: "Who owns \"is this worth building?\" before real spend?",
      options: [
        "Nobody clear",
        "Mostly engineering",
        "Product, late in the cycle",
        "Product, before build starts",
        "A cheap customer test before build"
      ],
      fix: "Run a cheap customer test (interview, fake door, or landing page) before any build ticket is opened."
    },
    {
      label: "Parallel streams",
      prompt: "How many work streams can one senior engineer run at once with agents?",
      options: [
        "Still mostly one",
        "Sometimes two",
        "Two with effort",
        "Several, with clear specs",
        "Several as the default, with WIP limits"
      ],
      fix: "Give seniors a multi-agent playbook: one clear spec per stream, shared review queue, and a hard WIP limit of three."
    },
    {
      label: "After an incident",
      prompt: "What happens after an incident?",
      options: [
        "Fix and move on",
        "Hotfix only, no write-up",
        "Postmortem sometimes",
        "Postmortem always",
        "Fix plus a permanent test so it does not return"
      ],
      fix: "Every Sev-1 or Sev-2 gets a permanent regression test before the ticket is closed."
    },
    {
      label: "If coding doubled",
      prompt: "If AI coding doubled tomorrow, what breaks first?",
      options: [
        "We do not know",
        "Coding quality or knowledge",
        "Review or test capacity",
        "Release, compliance, or decision speed",
        "Nothing material; the path already keeps up"
      ],
      fix: "Run a tabletop: double coding output for two weeks on paper, then fund the stage that fails first (review, test, release, or decisions)."
    }
  ];

  var bands = [
    {
      id: "assisted",
      name: "Assisted",
      min: 10,
      max: 26,
      summary: "AI coding tools are in use, if at all. The rest of the path to the customer still runs at the old speed. Customers are not getting new value much sooner.",
      next: "Start with the fixes below. Take the one closest to the customer first."
    },
    {
      id: "transitioning",
      name: "In transition",
      min: 27,
      max: 38,
      summary: "Some of the SDLC has caught up with faster coding. Review, test, release or sign-off still holds value back. The gain shows up in places, not across the whole path.",
      next: "Clear the fixes below before you add more AI tools."
    },
    {
      id: "ai-native",
      name: "AI-native",
      min: 39,
      max: 50,
      summary: "The path from idea to customer keeps pace with faster coding. Specs, tests, release and decisions are part of the same system.",
      next: "Give the next bet a target in revenue, retention or cost. Review it when the work goes live."
    }
  ];

  function validScore(n) {
    return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
  }

  function scoreOf(answers) {
    if (!answers || answers.length !== questions.length) return null;
    var total = 0;
    for (var i = 0; i < answers.length; i++) {
      var n = answers[i];
      if (!validScore(n)) return null;
      total += n;
    }
    return total;
  }

  function bandFor(score) {
    for (var i = 0; i < bands.length; i++) {
      if (score >= bands[i].min && score <= bands[i].max) return bands[i];
    }
    return null;
  }

  function fixesFor(answers) {
    if (!answers || answers.length !== questions.length) return null;
    var list = [];
    for (var i = 0; i < answers.length; i++) {
      var n = answers[i];
      if (!validScore(n)) return null;
      if (n <= 3) list.push({ label: questions[i].label, fix: questions[i].fix, score: n });
    }
    return list;
  }

  return {
    questions: questions,
    bands: bands,
    scoreOf: scoreOf,
    bandFor: bandFor,
    fixesFor: fixesFor
  };
});
