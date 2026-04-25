export async function onRequestPost(context) {
  try {
    const { scores } = await context.request.json();
    // Client already has fallback verdicts — return null to use them
    return Response.json({ ok: true, verdict: null });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
