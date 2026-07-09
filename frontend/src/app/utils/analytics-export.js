/**
 * Analytics export utility — PDF (with logo) and CSV downloads.
 * Used by all role dashboards from their Analytics tab.
 * Design: clean white, green accents only, logo clearly visible.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_URL = new URL('../../assets/logo.png', import.meta.url).href;

const GREEN      = [21, 128, 61];    // green-700
const GREEN_DARK = [20, 83, 45];     // green-900
const GREEN_PALE = [240, 253, 244];  // green-50
const GRAY_DARK  = [17, 24, 39];     // gray-900
const GRAY_MID   = [107, 114, 128];  // gray-500
const GRAY_LIGHT = [249, 250, 251];  // gray-50 — very subtle alt rows
const BORDER     = [229, 231, 235];  // gray-200

async function loadLogoBase64() {
  try {
    const resp = await fetch(LOGO_URL);
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * exportAnalyticsPdf
 *
 * @param {object} opts
 * @param {string}   opts.role        - e.g. 'Supplier', 'Retailer'
 * @param {string}   opts.orgName     - Organisation / branch name
 * @param {object[]} opts.summaryRows - [{ label, value }]
 * @param {object[]} opts.tableData   - rows for the detailed table (can be [])
 * @param {string[]} opts.tableHeaders- column header strings
 * @param {string}   opts.title       - PDF title
 * @param {string}   [opts.subtitle]  - optional subtitle
 */
export async function exportAnalyticsPdf({
  role,
  orgName,
  summaryRows = [],
  tableData = [],
  tableHeaders = [],
  title,
  subtitle,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logoBase64 = await loadLogoBase64();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Header — white background, logo clearly visible ──────────────────────
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 12, 8, 24, 24);
  }

  const titleX = logoBase64 ? 42 : 14;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_DARK);
  doc.text(title || `${role} Analytics Report`, titleX, 18);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MID);
    doc.text(subtitle, titleX, 25);
  }

  // Generated date + org — top right
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MID);
  doc.text(`Generated: ${dateStr}`, pageW - 14, 14, { align: 'right' });
  doc.text(`${role}${orgName ? '  ·  ' + orgName : ''}`, pageW - 14, 21, { align: 'right' });

  // Solid green rule under header
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1);
  doc.line(14, 36, pageW - 14, 36);

  // ── Summary cards ────────────────────────────────────────────────────────
  let y = 44;
  if (summaryRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_DARK);
    doc.text('Summary', 14, y);
    y += 4;

    const cols = Math.min(summaryRows.length, 3);
    const colW = (pageW - 28) / cols;

    summaryRows.slice(0, 6).forEach((row, i) => {
      const col = i % cols;
      const rowOff = Math.floor(i / cols) * 20;
      const x = 14 + col * colW;
      const cy = y + rowOff;
      const cw = colW - 3;

      // Card: white fill, light gray border, thin green left accent
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(x, cy, cw, 17, 'FD');
      doc.setFillColor(...GREEN);
      doc.rect(x, cy, 2, 17, 'F');

      // Value
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREEN);
      doc.text(String(row.value ?? '—'), x + 6, cy + 9);

      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_MID);
      doc.text(row.label, x + 6, cy + 14);
    });

    const rowCount = Math.ceil(Math.min(summaryRows.length, 6) / cols);
    y += rowCount * 20 + 8;
  }

  // ── Bar chart ─────────────────────────────────────────────────────────────
  if (summaryRows.length > 1) {
    // Section heading
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_DARK);
    doc.text('Overview Chart', 14, y);
    y += 8; // space between heading and chart top

    const chartH = 42;
    const chartW = pageW - 28;
    const barCount = Math.min(summaryRows.length, 6);
    const barSlot = chartW / barCount;
    const barW = barSlot * 0.45;
    const maxVal = Math.max(1, ...summaryRows.slice(0, barCount).map((r) =>
      Number(String(r.value).replace(/[^0-9.]/g, '')) || 0));

    // Baseline
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, y + chartH, 14 + chartW, y + chartH);

    summaryRows.slice(0, barCount).forEach((row, i) => {
      const numVal = Number(String(row.value).replace(/[^0-9.]/g, '')) || 0;
      const barH = Math.max(2, (numVal / maxVal) * chartH);
      const bx = 14 + i * barSlot + (barSlot - barW) / 2;
      const by = y + chartH - barH;

      doc.setFillColor(...GREEN);
      doc.rect(bx, by, barW, barH, 'F');

      // Value above bar
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY_DARK);
      doc.text(String(row.value), bx + barW / 2, by - 3, { align: 'center' });

      // Label below baseline
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_MID);
      const lines = doc.splitTextToSize(row.label, barSlot - 2);
      doc.text(lines, bx + barW / 2, y + chartH + 5, { align: 'center' });
    });

    y += chartH + 20; // space between chart bottom and next section
  }

  // ── Detailed records table ────────────────────────────────────────────────
  if (tableData.length > 0 && tableHeaders.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_DARK);
    doc.text(`Detailed Records  (${tableData.length})`, 14, y);
    y += 4;

    // Status breakdown line
    const lastColIdx = tableHeaders.length - 1;
    const lastHeader = (tableHeaders[lastColIdx] || '').toLowerCase();
    if (lastHeader.includes('status') || lastHeader.includes('otp')) {
      const counts = {};
      tableData.forEach((row) => { const v = String(row[lastColIdx] || 'Unknown'); counts[v] = (counts[v] || 0) + 1; });
      const entries = Object.entries(counts).slice(0, 5);
      if (entries.length > 1) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_MID);
        doc.text(entries.map(([k, v]) => `${k}: ${v}`).join('   ·   '), 14, y + 4);
        y += 7;
      }
    }

    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3.5,
        textColor: GRAY_DARK,
        lineColor: BORDER,
        lineWidth: 0.25,
        fillColor: [255, 255, 255],
      },
      headStyles: {
        fillColor: GREEN,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MID);
    doc.text('CoffeeChain — Fertilizer Supply Chain Management System', 14, pageH - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
  }

  const safeName = (orgName || role || 'analytics').replace(/\s+/g, '_').toLowerCase();
  const timestamp = now.toISOString().slice(0, 10);
  doc.save(`${safeName}_analytics_${timestamp}.pdf`);
}

/**
 * exportAnalyticsExcel — generates a well-structured .xlsx file with two sheets:
 *   Sheet 1 "Summary"  — report metadata + summary metrics
 *   Sheet 2 "Records"  — full detailed records table
 */
export async function exportAnalyticsCsv({
  summaryRows = [],
  tableData = [],
  tableHeaders = [],
  filename = 'analytics',
  role = '',
  orgName = '',
}) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Sheet 1: Summary ────────────────────────────────────────────────────
  const summarySheet = [];

  // Report metadata block
  summarySheet.push(['CoffeeChain Analytics Report', '', '']);
  summarySheet.push(['']);
  summarySheet.push(['Role', role]);
  summarySheet.push(['Organisation', orgName]);
  summarySheet.push(['Generated', dateStr]);
  summarySheet.push(['']);

  // Summary metrics table
  if (summaryRows.length) {
    summarySheet.push(['SUMMARY', '']);
    summarySheet.push(['Metric', 'Value']);
    summaryRows.forEach((r) => {
      const numVal = Number(String(r.value).replace(/[^0-9.]/g, ''));
      summarySheet.push([r.label, isNaN(numVal) ? r.value : numVal]);
    });
    summarySheet.push(['']);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summarySheet);

  // Column widths for summary sheet
  ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // ── Sheet 2: Records ────────────────────────────────────────────────────
  if (tableData.length && tableHeaders.length) {
    const recordsSheet = [];

    // Metadata header rows
    recordsSheet.push([`CoffeeChain — ${role} Analytics Report`, ...Array(tableHeaders.length - 1).fill('')]);
    recordsSheet.push([`Organisation: ${orgName}`, ...Array(tableHeaders.length - 1).fill('')]);
    recordsSheet.push([`Generated: ${dateStr}`, ...Array(tableHeaders.length - 1).fill('')]);
    recordsSheet.push(Array(tableHeaders.length).fill(''));

    // Column headers row
    recordsSheet.push(tableHeaders);

    // Data rows — coerce numbers
    tableData.forEach((row) => {
      recordsSheet.push(
        row.map((cell) => {
          if (cell === null || cell === undefined || cell === '—') return '';
          const n = Number(cell);
          return !isNaN(n) && String(cell).trim() !== '' ? n : String(cell);
        })
      );
    });

    const ws2 = XLSX.utils.aoa_to_sheet(recordsSheet);

    // Auto column widths based on content
    const colWidths = tableHeaders.map((h, ci) => {
      const maxLen = Math.max(
        h.length,
        ...tableData.map((row) => String(row[ci] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
    });
    ws2['!cols'] = colWidths;

    // Freeze the header row (row 5 = index 4, after 4 meta rows)
    ws2['!freeze'] = { xSplit: 0, ySplit: 5 };

    XLSX.utils.book_append_sheet(wb, ws2, 'Records');
  }

  // Save
  const safeName = (filename || 'analytics').replace(/\s+/g, '_').toLowerCase();
  const timestamp = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeName}_${timestamp}.xlsx`);
}
