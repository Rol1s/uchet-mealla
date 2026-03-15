import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
  width?: number;
}

export function exportToXlsx<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const headers = columns.map(col => col.header);
  
  const rows = data.map(row => 
    columns.map(col => {
      if (typeof col.accessor === 'function') {
        return col.accessor(row);
      }
      return row[col.accessor];
    })
  );
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные');
  
  XLSX.writeFile(workbook, filename);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

export function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num == null) return '';
  return num.toFixed(decimals);
}

export function formatCurrency(num: number | null | undefined): string {
  if (num == null) return '';
  return num.toLocaleString('ru-RU');
}
