export async function onRequestPost(context) {
  try {
    const { email, scores, verdict, diagnosticId } = await context.request.json();

    const overallScore = scores
      ? Math.round((scores.product + scores.people + scores.process) / 3)
      : null;

    const scoreLabel = (s) => s >= 8 ? 'Strong' : s >= 5 ? 'Developing' : 'Early stage';

    const scoresHtml = scores ? `
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr style="background:#f5f5f3;">
          <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;">Dimension</td>
          <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;text-align:right;">Score</td>
          <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;text-align:right;">Rating</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;">Product</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${scores.product}/10</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;color:#666;">${scoreLabel(scores.product)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;">People</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${scores.people}/10</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;color:#666;">${scoreLabel(scores.people)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;">Process</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;">${scores.process}/10</td>
          <td style="padding:10px 14px;text-align:right;color:#666;">${scoreLabel(scores.process)}</td>
        </tr>
      </table>
    ` : '';

    const verdictHtml = verdict ? `
      <p style="font-size:20px;font-weight:700;color:#111;margin:0 0 16px;">${verdict.headline}</p>
      ${verdict.product_line ? `<p style="margin:0 0 4px;"><b>Product:</b> ${verdict.product_line}</p>` : ''}
      ${verdict.product_rec ? `<p style="background:#f5f5f3;border-left:3px solid #39ff7a;padding:10px 14px;font-size:13px;color:#444;margin:0 0 16px;">${verdict.product_rec}</p>` : ''}
      ${verdict.people_line ? `<p style="margin:0 0 4px;"><b>People:</b> ${verdict.people_line}</p>` : ''}
      ${verdict.people_rec ? `<p style="background:#f5f5f3;border-left:3px solid #39ff7a;padding:10px 14px;font-size:13px;color:#444;margin:0 0 16px;">${verdict.people_rec}</p>` : ''}
      ${verdict.process_line ? `<p style="margin:0 0 4px;"><b>Process:</b> ${verdict.process_line}</p>` : ''}
      ${verdict.process_rec ? `<p style="background:#f5f5f3;border-left:3px solid #39ff7a;padding:10px 14px;font-size:13px;color:#444;margin:0 0 16px;">${verdict.process_rec}</p>` : ''}
      ${verdict.cta_hook ? `<p style="font-size:17px;color:#111;margin:24px 0 0;"><em>${verdict.cta_hook}</em></p>` : ''}
    ` : '';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Nth Layer <hello@nthlayer.co.uk>',
        to: [email],
        bcc: ['matthewdewstowe@gmail.com'],
        subject: 'Your AI Diagnostic Results — The Nth Layer',
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;padding:40px 24px;">
            <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin:0 0 24px;">Quick Diagnostic</p>
            ${overallScore !== null ? `<p style="font-size:13px;color:#666;margin:0 0 32px;">Overall score: <b style="color:#111;">${overallScore}/10</b></p>` : ''}
            ${verdictHtml}
            ${scoresHtml}
            <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
            <p style="font-size:14px;color:#333;">Want to discuss your results?<br><a href="https://nthlayer.co.uk" style="color:#111;font-weight:700;">Book a call with The Nth Layer →</a></p>
            <p style="font-size:11px;color:#aaa;margin-top:32px;">The Nth Layer · nthlayer.co.uk</p>
          </div>
        `
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ ok: false, error: err }, { status: res.status });
    }
    return Response.json({ ok: true, message: 'Results sent. Check your inbox.' });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
