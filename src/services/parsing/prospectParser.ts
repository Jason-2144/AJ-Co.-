import { Prospect, ProspectStatus, ParsingError, ParseResult } from '../../types/prospect.js';

// Helper to generate a browser-safe UUID
export const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ColumnMapping {
  companyIdx: number;
  websiteIdx: number;
  cityIdx: number;
  stateIdx: number;
  contactsIdx: number;
  emailsIdx: number;
}

/**
 * Normalizes email format validation
 */
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Prepends protocol to website if absent, and validates basic structure
 */
const formatWebsite = (url: string): string => {
  let cleaned = url.trim();
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
};

/**
 * Splits email string by common delimiters (commas, semicolons, whitespace)
 */
const parseEmailList = (val: string): string[] => {
  if (!val) return [];
  return val
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(Boolean);
};

/**
 * Splits contact names by commas or semicolons
 */
const parseContactsList = (val: string): string[] => {
  if (!val) return [];
  return val
    .split(/[,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
};

/**
 * Inspects a 2D array of rows to map columns to Prospect properties.
 * Detects headers if present; falls back to statistical column data analysis if missing.
 */
export function detectColumnMapping(rows: string[][]): { mapping: ColumnMapping; hasHeaderRow: boolean } {
  const defaultMapping: ColumnMapping = {
    companyIdx: -1,
    websiteIdx: -1,
    cityIdx: -1,
    stateIdx: -1,
    contactsIdx: -1,
    emailsIdx: -1,
  };

  if (rows.length === 0) {
    return { mapping: defaultMapping, hasHeaderRow: false };
  }

  const firstRow = rows[0];
  const headerMapping = { ...defaultMapping };
  let matchedHeadersCount = 0;

  // 1. Keyword-based Header Matching
  firstRow.forEach((cell, idx) => {
    const cleanCell = cell.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (/^(company|companyname|name|business|firm|organization|org|prospect|prospectname)$/.test(cleanCell)) {
      headerMapping.companyIdx = idx;
      matchedHeadersCount++;
    } else if (/^(website|url|site|websiteurl|link|webpage)$/.test(cleanCell)) {
      headerMapping.websiteIdx = idx;
      matchedHeadersCount++;
    } else if (/^(city|town|location|municipality)$/.test(cleanCell)) {
      headerMapping.cityIdx = idx;
      matchedHeadersCount++;
    } else if (/^(state|province|region|territory)$/.test(cleanCell)) {
      headerMapping.stateIdx = idx;
      matchedHeadersCount++;
    } else if (/^(contacts|contact|contactname|people|names|person|representative|owner|founder|decisionmaker)$/.test(cleanCell)) {
      headerMapping.contactsIdx = idx;
      matchedHeadersCount++;
    } else if (/^(emails|email|emailaddress|contactemail|mails|mail)$/.test(cleanCell)) {
      headerMapping.emailsIdx = idx;
      matchedHeadersCount++;
    }
  });

  // If we match 2 or more columns, we classify this row as a Header Row
  if (matchedHeadersCount >= 2) {
    return { mapping: headerMapping, hasHeaderRow: true };
  }

  // 2. Data Auto-Detection Heuristics (no explicit headers found)
  const detectedMapping = { ...defaultMapping };
  const sampleCount = Math.min(rows.length, 5);
  const maxCols = Math.max(...rows.map((r) => r.length));

  // Collect type distribution across columns
  const colStats = Array.from({ length: maxCols }, () => ({
    emailMatches: 0,
    urlMatches: 0,
    emptyMatches: 0,
    textMatches: 0,
  }));

  for (let r = 0; r < sampleCount; r++) {
    const row = rows[r];
    for (let c = 0; c < maxCols; c++) {
      const val = (row[c] || '').trim();
      if (!val) {
        colStats[c].emptyMatches++;
        continue;
      }
      if (val.includes('@')) {
        colStats[c].emailMatches++;
      } else if (/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i.test(val) || val.startsWith('www.')) {
        colStats[c].urlMatches++;
      } else {
        colStats[c].textMatches++;
      }
    }
  }

  // Determine emails and website columns based on data matches
  for (let c = 0; c < maxCols; c++) {
    const stats = colStats[c];
    const nonTemplatesCount = sampleCount - stats.emptyMatches;
    if (nonTemplatesCount > 0) {
      if (stats.emailMatches / nonTemplatesCount > 0.5) {
        detectedMapping.emailsIdx = c;
      } else if (stats.urlMatches / nonTemplatesCount > 0.5) {
        detectedMapping.websiteIdx = c;
      }
    }
  }

  // Map Company to the first text column that isn't mapped to website or emails
  for (let c = 0; c < maxCols; c++) {
    if (c !== detectedMapping.emailsIdx && c !== detectedMapping.websiteIdx) {
      detectedMapping.companyIdx = c;
      break;
    }
  }

  // Assign remaining columns to City, State, Contacts based on position
  const remainingCols: number[] = [];
  for (let c = 0; c < maxCols; c++) {
    if (
      c !== detectedMapping.emailsIdx &&
      c !== detectedMapping.websiteIdx &&
      c !== detectedMapping.companyIdx
    ) {
      // Ignore columns that are entirely blank in the sample rows
      if (colStats[c] && colStats[c].emptyMatches === sampleCount) {
        continue;
      }
      remainingCols.push(c);
    }
  }

  if (remainingCols.length === 1) {
    detectedMapping.contactsIdx = remainingCols[0];
  } else if (remainingCols.length === 2) {
    detectedMapping.cityIdx = remainingCols[0];
    detectedMapping.contactsIdx = remainingCols[1];
  } else if (remainingCols.length >= 3) {
    // Fits tab paste format: Flip Health (0) | Web (1) | (Empty/ignore, 2) | City (3) | State (4) | Contacts (5) | Emails (6)
    detectedMapping.cityIdx = remainingCols[0];
    detectedMapping.stateIdx = remainingCols[1];
    detectedMapping.contactsIdx = remainingCols[2];
  }

  return { mapping: detectedMapping, hasHeaderRow: false };
}

/**
 * Validates, formats, and transforms a 2D string grid into a unified ParseResult.
 */
export function parseProspectRows(rows: string[][]): ParseResult {
  const result: ParseResult = {
    prospects: [],
    errors: [],
    totalRows: 0,
    validCount: 0,
    skippedCount: 0,
  };

  // Filter out rows that are completely empty
  const cleanRows = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  result.totalRows = cleanRows.length;

  if (cleanRows.length === 0) {
    return result;
  }

  // Detect mapping from clean rows
  const { mapping, hasHeaderRow } = detectColumnMapping(cleanRows);
  const dataStartIndex = hasHeaderRow ? 1 : 0;

  // Adjust total rows for headers
  if (hasHeaderRow) {
    result.totalRows = Math.max(0, cleanRows.length - 1);
  }

  for (let i = dataStartIndex; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    const displayRowNum = i + 1; // 1-indexed row number
    const rawContent = row.join('\t');
    const rowErrors: string[] = [];

    // Map cells
    const company = mapping.companyIdx !== -1 ? (row[mapping.companyIdx] || '').trim() : '';
    const websiteRaw = mapping.websiteIdx !== -1 ? (row[mapping.websiteIdx] || '').trim() : '';
    const city = mapping.cityIdx !== -1 ? (row[mapping.cityIdx] || '').trim() : '';
    const state = mapping.stateIdx !== -1 ? (row[mapping.stateIdx] || '').trim() : '';
    const contactsRaw = mapping.contactsIdx !== -1 ? (row[mapping.contactsIdx] || '').trim() : '';
    const emailsRaw = mapping.emailsIdx !== -1 ? (row[mapping.emailsIdx] || '').trim() : '';

    // Validation 1: Company (Required)
    if (!company) {
      rowErrors.push('Missing company name');
    }

    // Validation 2: URL format (Optional, but if present must be validated)
    let website = '';
    if (websiteRaw) {
      website = formatWebsite(websiteRaw);
      try {
        new URL(website);
      } catch (err) {
        rowErrors.push(`Invalid website URL format: "${websiteRaw}"`);
        website = ''; // Nullify invalid URL for state
      }
    }

    // Validation 3: Contacts array
    const contacts = parseContactsList(contactsRaw);

    // Validation 4: Emails array
    const emails = parseEmailList(emailsRaw);
    emails.forEach((email) => {
      if (!isValidEmail(email)) {
        rowErrors.push(`Invalid email address: "${email}"`);
      }
    });

    // Skip completely invalid rows (e.g. no company name)
    if (!company) {
      result.skippedCount++;
      result.errors.push({
        row: displayRowNum,
        rawContent,
        errors: rowErrors,
      });
      continue;
    }

    // Generate Prospect object
    const prospect: Prospect = {
      id: generateUUID(),
      company,
      website: website || undefined,
      city: city || undefined,
      state: state || undefined,
      contacts,
      emails,
      status: ProspectStatus.queued,
    };

    result.prospects.push(prospect);
    result.validCount++;

    // If there were minor validation anomalies (e.g. invalid emails) but the row is saved,
    // record it under errors so the user can inspect issues.
    if (rowErrors.length > 0) {
      result.errors.push({
        row: displayRowNum,
        rawContent,
        errors: rowErrors,
      });
    }
  }

  return result;
}
