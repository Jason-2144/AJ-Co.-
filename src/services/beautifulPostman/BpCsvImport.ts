import { parseCSV } from '../parsing/csvParser';

export interface BpCsvRow {
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  email: string;
  title?: string;
  city?: string;
  state?: string;
}

// Apollo's export uses these header names (case varies, spacing varies) — map common
// aliases so a raw Apollo CSV drops straight in without manual remapping.
const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname'],
  lastName: ['last name', 'lastname'],
  company: ['company', 'company name', 'organization', 'account name'],
  website: ['website', 'company website', 'website url', 'company website url'],
  email: ['email', 'email address', 'work email'],
  title: ['title', 'job title', 'headline'],
  city: ['city', 'company city'],
  state: ['state', 'company state'],
};

function buildColumnMap(headerRow: string[]): Record<string, number> {
  const normalized = headerRow.map((h) => h.trim().toLowerCase());
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

export function parseApolloCsv(csvText: string): { rows: BpCsvRow[]; skipped: number; totalRows: number } {
  const table = parseCSV(csvText);
  if (table.length === 0) return { rows: [], skipped: 0, totalRows: 0 };

  const [headerRow, ...dataRows] = table;
  const colMap = buildColumnMap(headerRow);

  if (colMap.email === undefined) {
    throw new Error('Could not find an email column in this CSV. Expected a header like "Email" or "Email Address".');
  }

  const rows: BpCsvRow[] = [];
  let skipped = 0;

  for (const r of dataRows) {
    const email = (r[colMap.email] || '').trim();
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }
    rows.push({
      firstName: colMap.firstName !== undefined ? (r[colMap.firstName] || '').trim() : undefined,
      lastName: colMap.lastName !== undefined ? (r[colMap.lastName] || '').trim() : undefined,
      company: colMap.company !== undefined ? (r[colMap.company] || '').trim() : undefined,
      website: colMap.website !== undefined ? (r[colMap.website] || '').trim() : undefined,
      email,
      title: colMap.title !== undefined ? (r[colMap.title] || '').trim() : undefined,
      city: colMap.city !== undefined ? (r[colMap.city] || '').trim() : undefined,
      state: colMap.state !== undefined ? (r[colMap.state] || '').trim() : undefined,
    });
  }

  return { rows, skipped, totalRows: dataRows.length };
}
