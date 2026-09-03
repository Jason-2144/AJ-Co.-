import { Patient, PatientParseResult } from './PatientTypes.js';

// Reuses the same UUID generation approach as prospectParser.ts
export const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ColumnMapping {
  nameIdx: number;
  phoneIdx: number;
  lastVisitIdx: number;
  clinicIdx: number;
}

/**
 * Normalizes a raw phone number string into E.164 format (e.g. +15551234567).
 * Returns null if the value cannot be confidently normalized.
 */
export const normalizePhone = (raw: string): string | null => {
  let cleaned = raw.trim().replace(/[\s().-]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (!cleaned.startsWith('+')) {
    // Assume a bare digit string already includes the country code
    cleaned = '+' + cleaned;
  }

  // E.164: '+' followed by 8-15 digits
  if (!/^\+\d{8,15}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
};

/**
 * Inspects a 2D array of rows to map columns to Patient properties.
 * Detects headers if present; falls back to positional guessing otherwise.
 */
export function detectPatientColumnMapping(rows: string[][]): { mapping: ColumnMapping; hasHeaderRow: boolean } {
  const defaultMapping: ColumnMapping = { nameIdx: -1, phoneIdx: -1, lastVisitIdx: -1, clinicIdx: -1 };

  if (rows.length === 0) {
    return { mapping: defaultMapping, hasHeaderRow: false };
  }

  const firstRow = rows[0];
  const headerMapping = { ...defaultMapping };
  let matchedHeadersCount = 0;

  firstRow.forEach((cell, idx) => {
    const cleanCell = cell.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (/^(name|patientname|patient|fullname)$/.test(cleanCell)) {
      headerMapping.nameIdx = idx;
      matchedHeadersCount++;
    } else if (/^(phone|phonenumber|mobile|whatsapp|cell|contactnumber)$/.test(cleanCell)) {
      headerMapping.phoneIdx = idx;
      matchedHeadersCount++;
    } else if (/^(lastvisit|lastvisitdate|lastappointment|lastseen)$/.test(cleanCell)) {
      headerMapping.lastVisitIdx = idx;
      matchedHeadersCount++;
    } else if (/^(clinic|clinicname|practice|practicename)$/.test(cleanCell)) {
      headerMapping.clinicIdx = idx;
      matchedHeadersCount++;
    }
  });

  if (matchedHeadersCount >= 2) {
    return { mapping: headerMapping, hasHeaderRow: true };
  }

  // Positional fallback (no headers detected): assume Name, Phone, Last Visit, Clinic
  const detectedMapping = { ...defaultMapping };
  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols >= 1) detectedMapping.nameIdx = 0;
  if (maxCols >= 2) detectedMapping.phoneIdx = 1;
  if (maxCols >= 3) detectedMapping.lastVisitIdx = 2;
  if (maxCols >= 4) detectedMapping.clinicIdx = 3;

  return { mapping: detectedMapping, hasHeaderRow: false };
}

/**
 * Validates, formats, and transforms a 2D string grid into a unified PatientParseResult.
 */
export function parsePatientRows(rows: string[][]): PatientParseResult {
  const result: PatientParseResult = {
    patients: [],
    errors: [],
    totalRows: 0,
    validCount: 0,
    skippedCount: 0,
  };

  const cleanRows = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  result.totalRows = cleanRows.length;

  if (cleanRows.length === 0) {
    return result;
  }

  const { mapping, hasHeaderRow } = detectPatientColumnMapping(cleanRows);
  const dataStartIndex = hasHeaderRow ? 1 : 0;

  if (hasHeaderRow) {
    result.totalRows = Math.max(0, cleanRows.length - 1);
  }

  for (let i = dataStartIndex; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    const displayRowNum = i + 1;
    const rawContent = row.join('\t');
    const rowErrors: string[] = [];

    const name = mapping.nameIdx !== -1 ? (row[mapping.nameIdx] || '').trim() : '';
    const phoneRaw = mapping.phoneIdx !== -1 ? (row[mapping.phoneIdx] || '').trim() : '';
    const lastVisitRaw = mapping.lastVisitIdx !== -1 ? (row[mapping.lastVisitIdx] || '').trim() : '';
    const clinicName = mapping.clinicIdx !== -1 ? (row[mapping.clinicIdx] || '').trim() : '';

    if (!name) {
      rowErrors.push('Missing patient name');
    }

    let phone: string | null = null;
    if (!phoneRaw) {
      rowErrors.push('Missing phone number');
    } else {
      phone = normalizePhone(phoneRaw);
      if (!phone) {
        rowErrors.push(`Invalid phone number format: "${phoneRaw}" (use international format, e.g. +15551234567)`);
      }
    }

    let lastVisitDate: string | undefined;
    if (lastVisitRaw) {
      const parsed = new Date(lastVisitRaw);
      if (isNaN(parsed.getTime())) {
        rowErrors.push(`Invalid last visit date: "${lastVisitRaw}"`);
      } else {
        lastVisitDate = parsed.toISOString();
      }
    }

    if (!name || !phone) {
      result.skippedCount++;
      result.errors.push({ row: displayRowNum, rawContent, errors: rowErrors });
      continue;
    }

    const patient: Patient = {
      id: generateUUID(),
      name,
      phone,
      lastVisitDate,
      clinicName: clinicName || undefined,
    };

    result.patients.push(patient);
    result.validCount++;

    if (rowErrors.length > 0) {
      result.errors.push({ row: displayRowNum, rawContent, errors: rowErrors });
    }
  }

  return result;
}
