/* Preview scoring for the AI-Native Readiness Diagnostic.
   A = 1, B = 2, C = 3. Ten answers, max 30. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NthDiagnostic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var questions = [
    {
      prompt: "How much of engineering already uses AI coding tools?",
      options: ["Under 25%", "About half", "Most of the team"]
    },
    {
      prompt: "Since adopting AI tools, how much sooner do customers get new value?",
      options: ["No clear change", "A bit faster", "Materially faster, we can show it"]
    },
    {
      prompt: "Where does finished work wait longest?",
      options: ["Before build", "In review or test", "In release or sign-off"]
    },
    {
      prompt: "How often does a small, low-risk change go live?",
      options: ["Weekly or slower", "A few times a week", "Same day is normal"]
    },
    {
      prompt: "How is last quarter\u2019s product spend judged?",
      options: ["Tickets and velocity", "Mix of activity and outcomes", "Revenue, retention, or cost per bet"]
    },
    {
      prompt: "When is security and compliance checked?",
      options: ["Late, near release", "On major changes", "Built into the spec and every change"]
    },
    {
      prompt: "Who owns \"is this worth building?\" before real spend?",
      options: ["Mostly engineering", "Product, late in the cycle", "A cheap customer test before build"]
    },
    {
      prompt: "How many work streams can one senior engineer run at once with agents?",
      options: ["Still mostly one", "Sometimes two", "Several, with clear specs"]
    },
    {
      prompt: "What happens after an incident?",
      options: ["Fix and move on", "Postmortem sometimes", "Fix plus a permanent test so it doesn\u2019t return"]
    },
    {
      prompt: "If AI coding doubled tomorrow, what breaks first?",
      options: ["We don\u2019t know", "Review or test capacity", "Release, compliance, or decision speed"]
    }
  ];

  var bands = [
    {
      id: "assisted",
      name: "Assisted",
      min: 10,
      max: 16,
      summary: "AI coding tools are in use. The rest of the path to the customer still runs at the old speed. Customers are not getting new value much sooner.",
      next: "Pick one product area and mark where finished work waits longest. Start there."
    },
    {
      id: "transitioning",
      name: "In transition",
      min: 17,
      max: 23,
      summary: "Some of the SDLC has caught up with faster coding. Review, test, release or sign-off still holds value back. The gain shows up in places, not across the whole path.",
      next: "Name the slowest stage and rebuild that one before you add more AI tools."
    },
    {
      id: "ai-native",
      name: "AI-native",
      min: 24,
      max: 30,
      summary: "The path from idea to customer keeps pace with faster coding. Specs, tests, release and decisions are part of the same system.",
      next: "Give the next bet a target in revenue, retention or cost. Review it when the work goes live."
    }
  ];

  function scoreOf(answers) {
    if (!answers || answers.length !== questions.length) return null;
    var total = 0;
    for (var i = 0; i < answers.length; i++) {
      var n = answers[i];
      if (n !== 1 && n !== 2 && n !== 3) return null;
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

  return {
    questions: questions,
    bands: bands,
    scoreOf: scoreOf,
    bandFor: bandFor
  };
});
