/* Preview transcript analysis.
   Set NTH_LLM_API_KEY in the Cloudflare Pages environment to enable it.
   Optional: NTH_LLM_API_URL (default OpenAI chat completions), NTH_LLM_MODEL.
   Never commit the key. See diagnostic-call/README.md. */

var TERMS = ["decide", "decision", "build", "copilot", "test", "testing", "regression", "release", "deploy", "measure", "adoption", "usage", "metric", "week", "weeks", "month", "stuck", "wait", "bottleneck", "flag"];

function termsIn(text) {
  var found = [];
  var lower = String(text || "").toLowerCase();
  TERMS.forEach(function (t) {
    var re = new RegExp("\\b" + t + "\\b", "i");
    if (re.test(lower)) found.push(t);
  });
  return found;
}

function clean(s) {
  return String(s || "").replace(/\u2014/g, ",").replace(/\u2013/g, "-").trim();
}

function unconfigured(transcript) {
  return Response.json({
    configured: false,
    message: "AI analysis not configured",
    terms: termsIn(transcript)
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const transcript = String(body.transcript || "").slice(0, 20000);
    const key = context.env && context.env.NTH_LLM_API_KEY;
    if (!key) return unconfigured(transcript);

    const url = context.env.NTH_LLM_API_URL || "https://api.openai.com/v1/chat/completions";
    const model = context.env.NTH_LLM_MODEL || "gpt-4o-mini";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: "Bearer " + key,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You score an AI-native SDLC diagnostic from a call transcript. Reply with JSON only, no markdown. Keys: scores (decide, build, test, release, measure, each an integer 1 to 5), notes (same five keys, one short sentence each), quotes (up to 2 verbatim lines from the transcript), priorities (3 short actions). Do not use em dashes."
          },
          { role: "user", content: transcript }
        ]
      })
    });
    if (!res.ok) {
      return Response.json({ configured: true, error: "The model request failed.", terms: termsIn(transcript) }, { status: 502 });
    }
    const payload = await res.json();
    const text = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) {
      return Response.json({ configured: true, error: "The model did not return JSON.", terms: termsIn(transcript) }, { status: 502 });
    }
    const data = JSON.parse(text.slice(start, end + 1));
    const scores = {};
    ["decide", "build", "test", "release", "measure"].forEach(function (id) {
      const n = Math.round(Number(data.scores && data.scores[id]));
      if (n >= 1 && n <= 5) scores[id] = n;
    });
    const notes = {};
    ["decide", "build", "test", "release", "measure"].forEach(function (id) {
      if (data.notes && data.notes[id]) notes[id] = clean(data.notes[id]);
    });
    const quotes = (data.quotes || []).slice(0, 2).map(clean);
    const priorities = (data.priorities || []).slice(0, 3).map(clean);
    return Response.json({ configured: true, scores: scores, notes: notes, quotes: quotes, priorities: priorities });
  } catch (e) {
    return Response.json({ configured: false, message: "AI analysis not configured", terms: [] }, { status: 200 });
  }
}
