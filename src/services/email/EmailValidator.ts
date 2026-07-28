export class EmailValidator {
  /**
   * Parses, cleans, and validates the generated outreach email JSON output.
   * Repairs minor formatting mistakes and verifies key fields exist.
   */
  static cleanAndParse(text: string): any {
    const cleanText = text.trim();
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('AI output did not contain a valid JSON object structure for the email.');
    }

    let jsonString = cleanText.substring(startIdx, endIdx + 1);

    // Formatting repairs
    // Strip trailing commas in lists or objects: e.g. "a": 1, } -> "a": 1 }
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

    // Repair lone backslashes (escape them) that aren't followed by valid JSON escape codes
    jsonString = jsonString.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    try {
      const parsed = JSON.parse(jsonString);

      // Verify necessary email fields exist
      const requiredFields = [
        'subject',
        'preview',
        'opening',
        'body',
        'opportunities',
        'cta',
        'signature',
      ];
      
      const missingFields = requiredFields.filter((f) => !(f in parsed));
      if (missingFields.length > 0) {
        throw new Error(
          `AI Email JSON schema validation failed. Missing fields: ${missingFields.join(', ')}`
        );
      }

      // Verify and format opportunities array to match schema structure
      if (!Array.isArray(parsed.opportunities)) {
        parsed.opportunities = [];
      } else {
        parsed.opportunities = parsed.opportunities.map((op: any, index: number) => ({
          title: op.title || op.opportunity || `AI Automation Opportunity ${index + 1}`,
          problem: op.problem || 'Operational bottleneck',
          solution: op.solution || 'Custom automated workflow integration',
          benefit: op.benefit || 'Reduces overhead and improves accuracy',
        }));
      }

      if (parsed.confidence === undefined) {
        parsed.confidence = 75;
      }

      return parsed;
    } catch (error: any) {
      throw new Error(`JSON Email Schema Parser Failure: ${error?.message || 'Invalid syntax'}`);
    }
  }
}
export default EmailValidator;
