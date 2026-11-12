const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const FAIL = 'Something went wrong, please try again or email matthew@nthlayer.co.uk';
const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

export async function onRequestPost(context) {
  try {
    let body;
    try { body = await context.request.json(); }
    catch { return Response.json({ ok: false, error: FAIL }, { status: 400 }); }
    if (body.website) return Response.json({ ok: true });
    const name = clean(body.name, 120);
    const company = clean(body.company, 160);
    const jobtitle = clean(body.jobtitle ?? body.job_title, 160);
    const email = clean(body.email, 200);
    const message = String(body.message ?? '').trim().slice(0, 5000);
    if (!name) return Response.json({ ok: false, error: 'Please enter your name', field: 'name' }, { status: 400 });
    if (!email) return Response.json({ ok: false, error: 'Please enter your work email', field: 'email' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "That email address doesn't look right", field: 'email' }, { status: 400 });
    if (!jobtitle) return Response.json({ ok: false, error: 'Please enter your job title', field: 'jobtitle' }, { status: 400 });
    if (!company) return Response.json({ ok: false, error: 'Please enter your company', field: 'company' }, { status: 400 });
    if (!message) return Response.json({ ok: false, error: 'Please enter a message', field: 'message' }, { status: 400 });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Nth Layer <hello@nthlayer.co.uk>',
        to: ['matthewdewstowe@gmail.com'],
        reply_to: email,
        subject: `New enquiry from ${name}${company ? ` at ${company}` : ''}`,
        html: `
          <p><b>Name:</b> ${name}</p>
          <p><b>Company:</b> ${company}</p>
          <p><b>Job Title:</b> ${jobtitle}</p>
          <p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>
          <p><b>Message:</b></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      })
    });
    if (!res.ok) return Response.json({ ok: false, error: FAIL }, { status: 502 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: FAIL }, { status: 500 });
  }
}
