export async function onRequestPost(context) {
  try {
    const { email } = await context.request.json();

    // Fire-and-forget lead notification — don't block the UX
    context.waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Nth Layer <hello@nthlayer.co.uk>',
        to: ['matthewdewstowe@gmail.com'],
        subject: `New diagnostic lead: ${email}`,
        html: `<p>A new visitor started the AI Readiness Diagnostic.</p><p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>`
      })
    }));

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
