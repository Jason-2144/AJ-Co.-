export class DraftFormatter {
  /**
   * Constructs the HTML email layout from generated copy blocks and opportunity lists.
   */
  static formatHtmlBody(
    opening: string,
    body: string,
    opportunities: { title: string; problem: string; solution: string; benefit: string }[],
    cta: string,
    signature: string
  ): string {
    const opportunitiesHtml = opportunities
      .map(
        (op, idx) => `
        <div style="margin-bottom: 16px; padding: 12px; background-color: #f9f9f9; border-left: 4px solid #10b981; border-radius: 4px; font-family: Arial, sans-serif;">
          <div style="font-weight: bold; color: #111827; font-size: 14px; margin-bottom: 4px;">
            ${idx + 1}. ${op.title}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">
            <strong>Problem:</strong> ${op.problem}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">
            <strong>Suggested Automation:</strong> ${op.solution}
          </div>
          <div style="font-size: 12px; color: #047857;">
            <strong>Business Benefit:</strong> ${op.benefit}
          </div>
        </div>`
      )
      .join('');

    const formattedSignature = signature.replace(/\n/g, '<br />');

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333333; margin: 0; padding: 20px;">
    <p>${opening}</p>
    <p>${body}</p>
    <div style="margin: 20px 0;">
      ${opportunitiesHtml}
    </div>
    <p>${cta}</p>
    <p>${formattedSignature}</p>
  </body>
</html>
`.trim();
  }

  /**
   * Formats the plain text equivalent for email fallbacks.
   */
  static formatPlainText(
    opening: string,
    body: string,
    opportunities: { title: string; problem: string; solution: string; benefit: string }[],
    cta: string,
    signature: string
  ): string {
    const oppsText = opportunities
      .map(
        (op, idx) =>
          `${idx + 1}. ${op.title}\n   Problem: ${op.problem}\n   Solution: ${op.solution}\n   Benefit: ${op.benefit}`
      )
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
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(mimeString, 'utf-8').toString('base64');
    } else {
      base64 = btoa(unescape(encodeURIComponent(mimeString)));
    }

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
export default DraftFormatter;
