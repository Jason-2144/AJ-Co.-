import * as XLSX from 'xlsx';

/**
 * Reads an Excel (.xlsx) file, parses the first worksheet,
 * and returns it as a 2D array of strings.
 */
export async function parseExcel(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const target = e.target;
        if (!target || !target.result) {
          throw new Error('Failed to read Excel file data.');
        }

        const data = new Uint8Array(target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Convert the worksheet to a 2D array of raw values
        // header: 1 returns an array of arrays representing row-by-row data
        const rawJsonRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          raw: false,
          defval: '',
        });

        // Convert cell values to trimmed strings and filter out completely empty rows
        const parsedRows: string[][] = rawJsonRows
          .map((row) =>
            row.map((cell) =>
              cell !== null && cell !== undefined ? String(cell).trim() : ''
            )
          )
          .filter((row) => row.some((cell) => cell !== ''));

        resolve(parsedRows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
