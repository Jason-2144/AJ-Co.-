/**
 * Appwrite TablesDB REST wrapper.
 *
 * Note this is the TablesDB API (tables/rows), NOT the older Databases API
 * (collections/documents). Paths are /tablesdb/{db}/tables/{table}/rows and
 * creates use `rowId`, not `documentId`. Rows still expose `$id`.
 */

import { env } from './env.js';

const base = () => `${env.APPWRITE_ENDPOINT}/tablesdb/${env.APPWRITE_DATABASE_ID}/tables`;

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': env.APPWRITE_API_KEY,
  };
}

async function request(method, url, body) {
  if (env.DRY_RUN) {
    console.log(`[appwrite:dry-run] ${method} ${url}`, body ? JSON.stringify(body).slice(0, 300) : '');
    // Return an empty-but-valid shape so callers don't crash while dry-running.
    return method === 'GET' ? { rows: [], total: 0 } : { $id: 'dry-run-id' };
  }

  const res = await fetch(url, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(`Appwrite ${method} ${res.status}: ${json.message || text.slice(0, 200)}`);
  }
  return json;
}

/** Appwrite query string helpers — these mirror the Query.* helpers in the web SDK. */
export const Query = {
  equal: (attr, val) => `equal("${attr}", ${JSON.stringify(Array.isArray(val) ? val : [val])})`,
  notEqual: (attr, val) => `notEqual("${attr}", ${JSON.stringify([val])})`,
  lessThan: (attr, val) => `lessThan("${attr}", ${JSON.stringify([val])})`,
  greaterThan: (attr, val) => `greaterThan("${attr}", ${JSON.stringify([val])})`,
  limit: (n) => `limit(${n})`,
  offset: (n) => `offset(${n})`,
  orderDesc: (attr) => `orderDesc("${attr}")`,
  orderAsc: (attr) => `orderAsc("${attr}")`,
};

/** Lists rows, following pagination so callers always get the full set. */
export async function listRows(table, queries = [], { pageSize = 100, max = 5000 } = {}) {
  const out = [];
  let offset = 0;

  while (out.length < max) {
    const qs = [...queries, Query.limit(pageSize), Query.offset(offset)]
      .map((q) => `queries[]=${encodeURIComponent(q)}`)
      .join('&');
    const body = await request('GET', `${base()}/${table}/rows?${qs}`);
    const rows = body.rows || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

export async function getRow(table, rowId) {
  try {
    return await request('GET', `${base()}/${table}/rows/${rowId}`);
  } catch (err) {
    if (String(err.message).includes('404')) return null;
    throw err;
  }
}

/** Creates a row. Pass rowId to use a natural key (patient_id, claim_id, etc.). */
export async function createRow(table, data, rowId = 'unique()') {
  return request('POST', `${base()}/${table}/rows`, { rowId, data });
}

export async function updateRow(table, rowId, data) {
  return request('PATCH', `${base()}/${table}/rows/${rowId}`, { data });
}

/**
 * Creates the row, or patches it if it already exists.
 * Used where a natural key (patient_id) is the row ID and the caller doesn't
 * know or care whether this is the first write.
 */
export async function upsertRow(table, rowId, data) {
  try {
    return await createRow(table, data, rowId);
  } catch (err) {
    if (String(err.message).match(/409|already exists/i)) {
      return updateRow(table, rowId, data);
    }
    throw err;
  }
}

export const TABLES = {
  REENGAGEMENT_LOG: 'reengagement_log',
  CALLS_LOG: 'calls_log',
  APPOINTMENTS: 'appointments',
  WAITLIST_OFFERS: 'waitlist_offers',
  PENDING_TREATMENTS: 'pending_treatments',
  RATINGS: 'ratings',
  CLAIMS: 'claims',
  REVENUE_RECOVERED: 'revenue_recovered',
  COMPLETED_VISITS: 'completed_visits',
  REMINDER_LOG: 'reminder_log',
};
