const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { sanitizeString } = require('../utils/validators');

class ExportService {

  async toExcel(results) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FB Ads Lead Extractor';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Leads');

    ws.columns = [
      { header: 'Business Name', key: 'businessName', width: 30 },
      { header: 'Page Name', key: 'pageName', width: 25 },
      { header: 'Website URL', key: 'websiteUrl', width: 40 },
      { header: 'Phone Number', key: 'phone', width: 25 },
      { header: 'WhatsApp Link', key: 'whatsappLink', width: 35 },
      { header: 'CTA', key: 'cta', width: 18 },
      { header: 'Ad Link', key: 'adLink', width: 40 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    for (let i = 1; i <= ws.columns.length; i++) {
      ws.getCell(1, i).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    }

    for (const row of results) {
      const phones = row.phones || [];
      const waLinks = row.whatsappLinks || [];

      if (phones.length === 0 && waLinks.length === 0) {
        const dataRow = ws.addRow({
          businessName: sanitizeString(row.businessName) || '—',
          pageName: sanitizeString(row.pageName) || '—',
          websiteUrl: row.websiteUrl || '—',
          phone: '—',
          whatsappLink: '—',
          cta: sanitizeString(row.cta) || '—',
          adLink: row.adLink || '—',
        });
        dataRow.alignment = { vertical: 'top', wrapText: true };
        dataRow.getCell(4).numFmt = '@';
        dataRow.getCell(5).numFmt = '@';
        continue;
      }

      const maxRows = Math.max(phones.length, waLinks.length || 1);

      for (let i = 0; i < maxRows; i++) {
        const dataRow = ws.addRow({
          businessName: sanitizeString(row.businessName) || '—',
          pageName: sanitizeString(row.pageName) || '—',
          websiteUrl: row.websiteUrl || '—',
          phone: i < phones.length ? phones[i] : '',
          whatsappLink: i < waLinks.length ? (waLinks[i].link || waLinks[i]) : '',
          cta: i === 0 ? (sanitizeString(row.cta) || '—') : '',
          adLink: i === 0 ? (row.adLink || '—') : '',
        });
        dataRow.alignment = { vertical: 'top', wrapText: true };
        dataRow.getCell(4).numFmt = '@';
        dataRow.getCell(5).numFmt = '@';
      }
    }

    const filename = `leads-${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../../temp', filename);
    await workbook.xlsx.writeFile(filepath);
    return filename;
  }

  getFilePath(fileName) {
    return path.join(__dirname, '../../temp', fileName);
  }
}

module.exports = ExportService;
