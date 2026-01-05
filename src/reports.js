import PDFDocument from 'pdfkit';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs/promises';

export async function generatePdfFromHtml(htmlContent, title, requirementName) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    if (requirementName) {
      const fileNameWithoutExtension = requirementName.split('.').slice(0, -1).join('.');
      doc.fontSize(12).text(`Requirement: ${fileNameWithoutExtension}`, { align: 'center' });
      doc.moveDown();
    }
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    // Content
    const plain = htmlContent.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const lines = plain.split(/\r?\n/).filter(Boolean);

    let currentSection = '';
    for (const line of lines) {
      if (/^##\s+(.+)/.test(line)) {
        // Add extra space before each section
        if (currentSection) doc.moveDown(1.2);
        currentSection = line.replace(/^##\s+/, '');
        const displayTitle = currentSection
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        doc.fontSize(14).font('Helvetica-Bold').text(displayTitle);
        doc.moveDown(0.5);
      } else if (/^[-*]\s+/.test(line)) {
        const item = line.replace(/^[-*]\s+/, '');
        doc.fontSize(11).font('Helvetica').text(`• ${item}`, { indent: 10 });
        doc.moveDown(0.3);
      } else if (/^\s*(SUGGESTION|IMPORTANT|RECOMMENDATION)\s*:/i.test(line)) {
        const item = line.replace(/^\s*(SUGGESTION|IMPORTANT|RECOMMENDATION)\s*:/i, '').replace(/^Suggestion:\s*/i, '').replace(/^Suggestion\s*/i, '').trim();
        doc.fontSize(11).font('Helvetica-Bold').fillColor('blue').text(`▶ ${item}`, { indent: 10 });
        doc.fillColor('black');
        doc.moveDown(0.3);
      } else if (line.trim()) {
        doc.fontSize(11).font('Helvetica').text(line, { indent: 10 });
        doc.moveDown(0.3);
      }
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
  });
}

export function generateMissingTestsExcel() {
  const rows = [
    ['Test ID', 'Test Case Title', 'Priority', 'Test Steps', 'Expected Result', 'Notes'],
    ['TC001', 'Negative validation for required fields', 'High', '1) Submit form with missing required fields', 'System shows clear error messages', 'Cover all required fields'],
    ['TC002', 'Performance test for large data set', 'Medium', '1) Load page with 10,000 records', 'Page loads within 3 seconds', 'Measure load time'],
    ['TC003', 'Security test for unauthorized access', 'High', '1) Try to access protected endpoint without auth', 'Access denied with 401/403', 'Test each protected endpoint'],
    ['TC004', 'Boundary value for numeric input', 'Medium', '1) Enter min, max, just below/above values', 'Accepts within bounds, rejects out of bounds', 'Include edge values'],
    ['TC005', 'Concurrent user scenario', 'Medium', '1) Simulate 10 users performing same action', 'No data loss or inconsistent state', 'Use load testing tool'],
    ['TC006', 'Network failure during operation', 'Low', '1) Disconnect network mid-operation', 'Graceful error handling, no corruption', 'Test critical operations'],
    ['TC007', 'Malformed input handling', 'Medium', '1) Submit malformed JSON/invalid chars', 'System rejects with clear error', 'Try SQL injection patterns'],
    ['TC008', 'Data integrity after rollback', 'High', '1) Perform transaction, then rollback', 'Data returns to previous state', 'Audit logs remain intact'],
    ['TC009', 'Session timeout handling', 'Medium', '1) Let session expire, then act', 'Redirect to login, no data leak', 'Check all session-protected pages'],
    ['TC010', 'File upload size limit', 'Low', '1) Upload file exceeding max size', 'Clear error, no server crash', 'Test various file types']
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Missing Tests');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}
