export class DraftFormatter {
  /**
   * Constructs the HTML email layout from generated copy blocks and opportunity lists.
   */
  static formatHtmlBody(
    opening: string,
    body: string,
    opportunities: any[],
    cta: string,
    signature: string
  ): string {
    const opportunitiesHtml = (opportunities || [])
      .map((op, idx) => {
        const title = op.title || `Opportunity ${idx + 1}`;
        const problem = op.problem || 'Manual operational bottlenecks and workflow delays.';
        const solution = op.solution || op.description || 'Custom AI pipeline integration for automated workflow execution.';
        const benefit = op.benefit || op.impact || 'Streamlined turnaround times and operational cost reduction.';

        return `
        <div style="margin-bottom: 16px; padding: 16px; background-color: #fffdfa; border-left: 4px solid #d97706; border: 1px solid #fce7f3; border-left: 4px solid #d97706; border-radius: 8px; font-family: Arial, sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-weight: bold; color: #111827; font-size: 14px; margin-bottom: 6px;">
            ${idx + 1}. ${title}
          </div>
          <div style="font-size: 13px; color: #374151; margin-bottom: 4px; line-height: 1.5;">
            <strong style="color: #111827;">Problem:</strong> ${problem}
          </div>
          <div style="font-size: 13px; color: #374151; margin-bottom: 4px; line-height: 1.5;">
            <strong style="color: #111827;">Suggested Automation:</strong> ${solution}
          </div>
          <div style="font-size: 13px; color: #b45309; font-weight: 600; margin-top: 6px;">
            <strong style="color: #b45309;">Business Benefit:</strong> ${benefit}
          </div>
        </div>`;
      })
      .join('');

    const formattedSignature = (signature || '').replace(/\n/g, '<br />');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AJ & Co.</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr>
<td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

<tr>
<td style="padding:0;">
<img
src="https://ajandco.site/email/banner.png"
alt="AJ & Co."
width="600"
style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin:0 0 20px;color:#111111;font-size:24px;">
${opening}
</h2>

<p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#555555;">
${body}
</p>

${opportunitiesHtml ? `<div style="margin: 20px 0;">${opportunitiesHtml}</div>` : ''}

<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
<tr>
<td bgcolor="#000000" style="border-radius:6px;">
<a href="https://ajandco.site"
style="
display:inline-block;
padding:14px 28px;
font-size:16px;
font-weight:bold;
color:#ffffff;
text-decoration:none;">
${cta || 'Book a Free Strategy Call'}
</a>
</td>
</tr>
</table>

${formattedSignature ? `<p style="margin-top: 30px; font-size: 14px; color: #555555; line-height: 1.6;">${formattedSignature}</p>` : ''}

</td>
</tr>

<tr>
<td style="padding:30px;background:#fafafa;border-top:1px solid #eeeeee;text-align:center;font-size:13px;color:#777777;">

<strong>AJ &amp; Co.</strong><br>
We Automate Your Business Operations with AI.<br><br>

<a href="https://ajandco.site"
style="color:#777777;text-decoration:none;">
ajandco.site
</a>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`.trim();
  }

  /**
   * Formats the plain text equivalent for email fallbacks.
   */
  static formatPlainText(
    opening: string,
    body: string,
    opportunities: any[],
    cta: string,
    signature: string
  ): string {
    const oppsText = (opportunities || [])
      .map((op, idx) => {
        const title = op.title || `Opportunity ${idx + 1}`;
        const problem = op.problem || 'Manual operational bottlenecks and workflow delays.';
        const solution = op.solution || op.description || 'Custom AI pipeline integration for automated workflow execution.';
        const benefit = op.benefit || op.impact || 'Streamlined turnaround times and operational cost reduction.';
        return `${idx + 1}. ${title}\n   Problem: ${problem}\n   Suggested Automation: ${solution}\n   Business Benefit: ${benefit}`;
      })
      .join('\n\n');

    return `${opening}\n\n${body}\n\n${oppsText}\n\n${cta}\n\n${signature}`.trim();
  }

  /**
   * Builds the Base64Url MIME raw content string compatible with Gmail APIs.
   */
  static buildMimeBase64(
    to: string,
    subject: string,
    plainText: string,
    htmlText: string
  ): string {
    const boundary = 'outreach_alternative_boundary';

    const parts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      plainText,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlText,
      '',
      `--${boundary}--`
    ];

    const mimeString = parts.join('\r\n');

    // Base64Url encoding (Node environment safe vs browser btoa)
    let base64 = '';
    try {
      if (typeof Buffer !== 'undefined') {
        base64 = Buffer.from(mimeString, 'utf-8').toString('base64');
      } else {
        const bytes = new TextEncoder().encode(mimeString);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) {
          bin += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(bin);
      }
    } catch (e) {
      base64 = btoa(unescape(encodeURIComponent(mimeString)));
    }

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
export default DraftFormatter;
