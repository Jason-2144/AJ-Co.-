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
        <div style="margin-bottom: 16px; padding: 14px; background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 6px; font-family: Arial, sans-serif;">
          <div style="font-weight: bold; color: #111827; font-size: 14px; margin-bottom: 6px;">
            ${idx + 1}. ${title}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;">
            <strong>Problem:</strong> ${problem}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;">
            <strong>Suggested Automation:</strong> ${solution}
          </div>
          <div style="font-size: 12px; color: #047857; font-weight: 500;">
            <strong>Business Benefit:</strong> ${benefit}
          </div>
        </div>`;
      })
      .join('');

    const formattedSignature = (signature || '').replace(/\n/g, '<br />');

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0; padding: 20px;">
    <p style="margin-bottom: 16px;">${opening}</p>
    <p style="margin-bottom: 20px;">${body}</p>
    <div style="margin: 20px 0;">
      ${opportunitiesHtml}
    </div>
    <p style="margin-bottom: 20px;">${cta}</p>
    <p style="margin-top: 24px; color: #4b5563;">${formattedSignature}</p>
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
