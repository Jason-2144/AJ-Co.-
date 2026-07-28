/**
 * Parses a standard RFC 4180 CSV string into a 2D string array.
 * Correctly handles quotes, newlines inside quotes, and escaped quotes ("").
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentVal += '"';
          i++; // Skip the next quote
        } else {
          // Closing double quote
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\r' || char === '\n') {
        row.push(currentVal);
        currentVal = '';
        
        // Add row if it contains at least one non-empty cell
        if (row.length > 0 && row.some(cell => cell.trim() !== '')) {
          result.push(row);
        }
        row = [];

        // Handle CRLF newlines
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
  }

  // Handle remaining data if not ending with newline
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    if (row.length > 0 && row.some(cell => cell.trim() !== '')) {
      result.push(row);
    }
  }

  return result;
}
