export async function onRequestPost(context) {
  try {
    const { scores, verdict } = await context.request.json();
    const id = crypto.randomUUID();
    return Response.json({ ok: true, diagnosticId: id });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
