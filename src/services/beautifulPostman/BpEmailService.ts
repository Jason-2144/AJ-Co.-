import { geminiService } from '../whatsapp/GeminiService';
import { bpRepository } from './BpRepository';
import { BpProspect, BpGeneratedEmail } from './types';

const PLACEHOLDER_PATTERNS = [
  /\[[^\]]{1,40}\]/g,        // [First Name], [Company], [insert X]
  /\{\{?[^}]{1,40}\}\}?/g,   // {name}, {{company}}
  /<[A-Z_]{2,30}>/g,          // <FIRST_NAME>
];

function findPlaceholders(text: string): string[] {
  const found: string[] = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    const matches = text.match(re);
    if (matches) found.push(...matches);
  }
  return found;
}

function buildSystemPrompt(exampleEmails: { subject: string; body: string }[], writingNotes: string): string {
  const examplesBlock = exampleEmails.length
    ? exampleEmails.map((e, i) => `Example ${i + 1}\nSubject: ${e.subject}\nBody:\n${e.body}`).join('\n\n---\n\n')
    : '(No examples provided yet — default to a short, casual, human tone.)';

  return `
You are writing cold outreach emails on behalf of AJ & Co.

VOICE RULES (non-negotiable):
- Short. A prospect should read the whole thing in under 15 seconds.
- Friendly and casual, like a real person emailing another real person. NOT corporate, NOT salesy, no "I hope this finds you well," no buzzwords like "synergy" or "leverage."
- The email must reference something specific and genuinely useful about THIS prospect/company, based only on the research provided. It should make them think "huh, that's actually useful" within the first two lines.
- Easy to read: short sentences, short paragraphs, no walls of text.

STYLE REFERENCE — match the tone, structure, and rhythm of these real examples as closely as possible while still personalizing content to the new prospect:
${examplesBlock}

${writingNotes ? `ADDITIONAL WRITING NOTES FROM THE USER:\n${writingNotes}\n` : ''}

HARD RULES:
- Never invent facts, numbers, or details not present in the research provided. If the research is thin, keep the email more generic in specifics but still short and human — do not fabricate.
- NEVER use placeholder tokens of any kind: no [First Name], no [Company], no {name}, no <TOKEN>. Every field must be filled with real values from the prospect data given to you.
- No fabricated case studies, stats, or claims about AJ & Co.'s results unless they appear in the examples above.

Respond with a valid JSON object ONLY, no markdown fences:
{"subject": "...", "body": "..."}
The body should use \\n for line breaks and end with a short, low-pressure sign-off (no heavy CTA, no "book a call" pressure unless that matches the example style).
`.trim();
}

function toHtml(bodyText: string): string {
  const escaped = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family: -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">${escaped.replace(/\n/g, '<br />')}</div>`;
}

export const bpEmailService = {
  /**
   * Mirrors the Relevance agent's steps 2-4: check there's enough to personalize with,
   * generate via the AI tool (never hand-write it here), verify no placeholders survive,
   * regenerate once if they do.
   */
  async generateEmail(prospect: BpProspect, research: string): Promise<BpGeneratedEmail> {
    const settings = await bpRepository.getSettings();
    const systemPrompt = buildSystemPrompt(settings.exampleEmails, settings.writingNotes);

    const prospectBlock = `
Prospect:
- First name: ${prospect.firstName || '(unknown — do not address by name if missing, use a generic but still casual greeting)'}
- Last name: ${prospect.lastName || ''}
- Title: ${prospect.title || 'unknown'}
- Company: ${prospect.company || 'unknown'}
- Website: ${prospect.website || 'none on file'}

Research on the company/website:
${research}
`.trim();

    let subject = '';
    let body = '';
    let everHadPlaceholders = false;
    let regenerateCount = 0;
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prompt = attempt === 0
        ? prospectBlock
        : `${prospectBlock}\n\nYour previous draft still contained placeholder tokens (like [First Name] or {company}). Regenerate the ENTIRE email with every field filled in using only the real data given above. If a field is genuinely unknown, write around it naturally instead of leaving a bracket.`;

      const raw = await geminiService.generateJSON(`${systemPrompt}\n\n${prompt}`);
      let clean = raw.trim();
      if (clean.startsWith('```')) clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      let parsed: { subject: string; body: string };
      try {
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('AI email generation returned invalid JSON.');
      }

      subject = (parsed.subject || '').trim();
      body = (parsed.body || '').trim();

      const placeholders = [...findPlaceholders(subject), ...findPlaceholders(body)];
      if (placeholders.length === 0) {
        break;
      }
      everHadPlaceholders = true;
      regenerateCount = attempt + 1;
      if (attempt === maxAttempts - 1) {
        throw new Error(`AI kept generating placeholder tokens after ${maxAttempts} attempts: ${placeholders.join(', ')}. Not sending — needs a human look.`);
      }
    }

    if (!subject || !body) {
      throw new Error('Generated email is missing a subject or body.');
    }

    return bpRepository.saveGeneratedEmail(prospect.id, subject, body, toHtml(body), everHadPlaceholders, regenerateCount);
  },
};

export default bpEmailService;
