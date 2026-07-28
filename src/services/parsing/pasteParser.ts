/**
 * Parses tab-separated text pasted from clipboard/textarea.
 * Splitting by newlines and then tabs. Ignores completely empty lines.
 */
export function parsePasteText(text: string): string[][] {
  if (!text || !text.trim()) {
    return [];
  }

  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue; // Skip empty rows
    }
    
    // Split by tabs
    const cells = line.split('\t').map(cell => cell.trim());
    rows.push(cells);
  }

  return rows;
}
