const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { sanitizeString } = require('../utils/validators');

class ExportService {

  async toExcel(results, type = 'facebook') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lead Extractor';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Leads');

    if (type === 'google_maps') {
      ws.columns = [
        { header: 'Business Name', key: 'businessName', width: 30 },
        { header: 'Address', key: 'address', width: 35 },
        { header: 'Category', key: 'cta', width: 20 },
        { header: 'Website URL', key: 'websiteUrl', width: 40 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Phone Number', key: 'phone', width: 25 },
        { header: 'WhatsApp Link', key: 'whatsappLink', width: 35 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Reviews', key: 'reviews', width: 12 },
        { header: 'Hours', key: 'hours', width: 30 },
      ];
    } else {
      ws.columns = [
        { header: 'Business Name', key: 'businessName', width: 30 },
        { header: 'Page Name', key: 'pageName', width: 25 },
        { header: 'Website URL', key: 'websiteUrl', width: 40 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Phone Number', key: 'phone', width: 25 },
        { header: 'WhatsApp Link', key: 'whatsappLink', width: 35 },
        { header: 'CTA', key: 'cta', width: 18 },
        { header: 'Ad Link', key: 'adLink', width: 40 },
      ];
    }

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
      const emails = row.emails || [];

      const maxRows = Math.max(phones.length, waLinks.length || 1, emails.length || 1);

      for (let i = 0; i < maxRows; i++) {
        let dataRow;

        if (type === 'google_maps') {
          dataRow = ws.addRow({
            businessName: i === 0 ? (sanitizeString(row.businessName) || '—') : '',
            address: i === 0 ? (row.address || '—') : '',
            cta: i === 0 ? (sanitizeString(row.cta) || '—') : '',
            websiteUrl: i === 0 ? (row.websiteUrl || '—') : '',
            email: i < emails.length ? emails[i] : '',
            phone: i < phones.length ? phones[i] : '',
            whatsappLink: i < waLinks.length ? (waLinks[i].link || waLinks[i]) : '',
            rating: i === 0 ? (row.rating || '—') : '',
            reviews: i === 0 ? (row.reviews || '—') : '',
            hours: i === 0 ? (row.hours || '—') : '',
          });
        } else {
          dataRow = ws.addRow({
            businessName: i === 0 ? (sanitizeString(row.businessName) || '—') : '',
            pageName: i === 0 ? (sanitizeString(row.pageName) || '—') : '',
            websiteUrl: i === 0 ? (row.websiteUrl || '—') : '',
            email: i < emails.length ? emails[i] : '',
            phone: i < phones.length ? phones[i] : '',
            whatsappLink: i < waLinks.length ? (waLinks[i].link || waLinks[i]) : '',
            cta: i === 0 ? (sanitizeString(row.cta) || '—') : '',
            adLink: i === 0 ? (row.adLink || '—') : '',
          });
        }

        dataRow.alignment = { vertical: 'top', wrapText: true };
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
