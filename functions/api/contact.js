export async function onRequestPost(context) {
  try {
    const { name, company, jobtitle, email, message } = await context.request.json();
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
          <p><b>Company:</b> ${company || '—'}</p>
          <p><b>Job Title:</b> ${jobtitle || '—'}</p>
          <p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>
          <p><b>Message:</b></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return Response.json({ ok: false, error: err }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
