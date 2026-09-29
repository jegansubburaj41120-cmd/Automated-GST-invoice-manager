const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { numberToWords } = require('../utils/numberToWords');

/**
 * Generate a professional A4 GST Tax Invoice PDF
 */
function generateInvoicePdf(invoice, items, customer, settings, qrDataUrl = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        bufferPages: true
      });

      const safeInvNo = (invoice.invoice_number || 'INV_000').replace(/[\/\\]/g, '_');
      const filename = `${safeInvNo}.pdf`;
      const invoicesDir = path.join(__dirname, '../public/invoices');

      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filePath = path.join(invoicesDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = '#1e3a8a';   // Deep Blue
      const secondaryColor = '#334155'; // Dark Slate
      const borderColor = '#cbd5e1';    // Slate 300
      const lightBg = '#f8fafc';        // Slate 50
      const headerBg = '#1e293b';       // Dark Navy

      // 1. TOP HEADER
      doc.rect(30, 30, 535, 80).fillAndStroke(lightBg, borderColor);

      // Company Info (Left)
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
        .text(settings.company_name || 'Acme GST Solutions Pvt Ltd', 40, 40);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text(`${settings.business_address || ''}, ${settings.city || ''} - ${settings.pincode || ''}, ${settings.state || ''} (Code: ${settings.state_code || ''})`, 40, 58, { width: 300 })
        .text(`Phone: ${settings.phone || ''} | Email: ${settings.email || ''}`, 40, 78)
        .text(`GSTIN: ${settings.gstin || ''} | PAN: ${settings.pan || ''}`, 40, 90);

      // Invoice Badge & Details (Right)
      doc.rect(370, 38, 185, 24).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('TAX INVOICE', 370, 44, { width: 185, align: 'center' });

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text(`Invoice No: `, 370, 68)
        .font('Helvetica-Bold').text(`${invoice.invoice_number}`, 430, 68)
        .font('Helvetica').text(`Invoice Date: `, 370, 80)
        .font('Helvetica-Bold').text(`${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`, 430, 80)
        .font('Helvetica').text(`Due Date: `, 370, 92)
        .font('Helvetica-Bold').text(`${new Date(invoice.due_date).toLocaleDateString('en-IN')}`, 430, 92);

      // 2. BILL TO & SUPPLY DETAILS
      doc.rect(30, 115, 260, 85).fillAndStroke('#ffffff', borderColor);
      doc.rect(295, 115, 270, 85).fillAndStroke('#ffffff', borderColor);

      // Bill To Title
      doc.rect(30, 115, 260, 18).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        .text('BILL TO (CUSTOMER DETAILS)', 38, 120);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica-Bold')
        .text(customer.name || 'Walk-in Customer', 38, 138);

      doc.font('Helvetica').fontSize(8)
        .text(`${customer.billing_address || ''}, ${customer.city || ''} - ${customer.pincode || ''}`, 38, 150, { width: 245 })
        .text(`State: ${customer.state || ''} (Code: ${customer.state_code || ''}) | Phone: ${customer.phone || ''}`, 38, 172)
        .text(`GSTIN: ${customer.gstin || 'Unregistered'} | PAN: ${customer.pan || 'N/A'}`, 38, 184);

      // Supply & Payment terms
      doc.rect(295, 115, 270, 18).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        .text('INVOICE & DISPATCH DETAILS', 303, 120);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text('Place of Supply:', 303, 138).font('Helvetica-Bold').text(`${invoice.place_of_supply || customer.state} (${invoice.place_of_supply_code || customer.state_code})`, 380, 138)
        .font('Helvetica').text('Supply Type:', 303, 150).font('Helvetica-Bold').text(invoice.is_inter_state ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)', 380, 150)
        .font('Helvetica').text('Payment Terms:', 303, 162).font('Helvetica-Bold').text(`${invoice.payment_terms || 'Due on Receipt'}`, 380, 162)
        .font('Helvetica').text('Payment Status:', 303, 174).font('Helvetica-Bold')
        .fillColor(invoice.status === 'PAID' ? '#059669' : (invoice.status === 'PARTIALLY PAID' ? '#d97706' : '#dc2626'))
        .text(`${invoice.status}`, 380, 174);

      // 3. ITEMS TABLE
      let tableTop = 205;
      const isInter = Boolean(invoice.is_inter_state);

      // Table Header
      doc.rect(30, tableTop, 535, 20).fill(headerBg);
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');

      doc.text('#', 34, tableTop + 6, { width: 16, align: 'center' });
      doc.text('Item Description', 52, tableTop + 6, { width: 140 });
      doc.text('HSN', 195, tableTop + 6, { width: 45, align: 'center' });
      doc.text('Qty', 242, tableTop + 6, { width: 35, align: 'center' });
      doc.text('Rate', 280, tableTop + 6, { width: 45, align: 'right' });
      doc.text('Taxable', 328, tableTop + 6, { width: 50, align: 'right' });
      
      if (isInter) {
        doc.text('IGST', 382, tableTop + 6, { width: 65, align: 'right' });
        doc.text('Total', 450, tableTop + 6, { width: 110, align: 'right' });
      } else {
        doc.text('CGST', 380, tableTop + 6, { width: 42, align: 'right' });
        doc.text('SGST', 424, tableTop + 6, { width: 42, align: 'right' });
        doc.text('Total', 470, tableTop + 6, { width: 90, align: 'right' });
      }

      let yPos = tableTop + 20;

      items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(30, yPos, 535, 18).fillAndStroke(rowBg, '#e2e8f0');

        doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica');
        doc.text(`${index + 1}`, 34, yPos + 5, { width: 16, align: 'center' });
        doc.font('Helvetica-Bold').text(item.product_name || 'Product', 52, yPos + 5, { width: 140, lineBreak: false });
        doc.font('Helvetica').text(item.hsn_code || '---', 195, yPos + 5, { width: 45, align: 'center' });
        doc.text(`${item.quantity} ${item.unit || 'NOS'}`, 242, yPos + 5, { width: 35, align: 'center' });
        doc.text(`₹${Number(item.unit_price).toFixed(2)}`, 280, yPos + 5, { width: 45, align: 'right' });
        doc.text(`₹${Number(item.taxable_value).toFixed(2)}`, 328, yPos + 5, { width: 50, align: 'right' });

        if (isInter) {
          doc.text(`${item.gst_rate}% (₹${Number(item.igst_amount).toFixed(2)})`, 382, yPos + 5, { width: 65, align: 'right' });
          doc.font('Helvetica-Bold').text(`₹${Number(item.line_total).toFixed(2)}`, 450, yPos + 5, { width: 110, align: 'right' });
        } else {
          doc.text(`₹${Number(item.cgst_amount).toFixed(2)}`, 380, yPos + 5, { width: 42, align: 'right' });
          doc.text(`₹${Number(item.sgst_amount).toFixed(2)}`, 424, yPos + 5, { width: 42, align: 'right' });
          doc.font('Helvetica-Bold').text(`₹${Number(item.line_total).toFixed(2)}`, 470, yPos + 5, { width: 90, align: 'right' });
        }

        yPos += 18;
      });

      // 4. SUMMARY & TOTALS SECTION
      const summaryTop = Math.max(yPos + 8, 430);

      // Left Box: Amount in words + Bank details + QR Code
      doc.rect(30, summaryTop, 320, 200).fillAndStroke('#ffffff', borderColor);

      // Amount in Words
      doc.rect(30, summaryTop, 320, 18).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        .text('AMOUNT IN WORDS', 38, summaryTop + 5);

      const inWords = numberToWords(invoice.grand_total);
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
        .text(inWords, 38, summaryTop + 24, { width: 304 });

      // Bank Details
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        .text('BANK & PAYMENT DETAILS', 38, summaryTop + 55);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text(`Bank Name: `, 38, summaryTop + 70).font('Helvetica-Bold').text(settings.bank_name || 'State Bank of India', 105, summaryTop + 70)
        .font('Helvetica').text(`Account No: `, 38, summaryTop + 82).font('Helvetica-Bold').text(settings.account_number || '123456789012', 105, summaryTop + 82)
        .font('Helvetica').text(`IFSC Code: `, 38, summaryTop + 94).font('Helvetica-Bold').text(settings.ifsc || 'SBIN0001234', 105, summaryTop + 94)
        .font('Helvetica').text(`UPI ID: `, 38, summaryTop + 106).font('Helvetica-Bold').text(settings.upi_id || 'acmegst@sbi', 105, summaryTop + 106);

      // QR Code on Left
      if (qrDataUrl) {
        try {
          doc.image(qrDataUrl, 250, summaryTop + 60, { width: 85, height: 85 });
          doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text('Scan to Pay UPI', 255, summaryTop + 148, { width: 80, align: 'center' });
        } catch (qrErr) {
          console.error('Error attaching QR code image:', qrErr);
        }
      }

      // Terms & Conditions
      doc.rect(30, summaryTop + 158, 320, 42).fill('#f8fafc');
      doc.fillColor(primaryColor).fontSize(7.5).font('Helvetica-Bold')
        .text('Terms & Conditions:', 38, summaryTop + 162);
      doc.fillColor(secondaryColor).fontSize(6.8).font('Helvetica')
        .text(settings.terms_conditions || '1. Goods once sold will not be taken back. 2. Subject to local jurisdiction. 3. Payment due within specified period.', 38, summaryTop + 172, { width: 304 });

      // Right Box: Calculation Breakdown
      doc.rect(355, summaryTop, 210, 200).fillAndStroke('#ffffff', borderColor);

      const renderSummaryRow = (label, value, y, isBold = false, isHighlight = false) => {
        if (isHighlight) {
          doc.rect(355, y - 2, 210, 20).fill('#e0e7ff');
          doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold');
        } else {
          doc.fillColor(secondaryColor).fontSize(8).font(isBold ? 'Helvetica-Bold' : 'Helvetica');
        }
        doc.text(label, 365, y);
        doc.text(value, 460, y, { width: 95, align: 'right' });
      };

      let sumY = summaryTop + 10;
      renderSummaryRow('Subtotal:', `₹${Number(invoice.subtotal).toFixed(2)}`, sumY);
      sumY += 16;
      renderSummaryRow('Discount:', `-₹${Number(invoice.discount_amount).toFixed(2)}`, sumY);
      sumY += 16;
      renderSummaryRow('Taxable Amount:', `₹${Number(invoice.taxable_amount).toFixed(2)}`, sumY, true);
      sumY += 16;

      if (isInter) {
        renderSummaryRow('IGST Total:', `₹${Number(invoice.igst_amount).toFixed(2)}`, sumY);
        sumY += 16;
      } else {
        renderSummaryRow('CGST Total:', `₹${Number(invoice.cgst_amount).toFixed(2)}`, sumY);
        sumY += 14;
        renderSummaryRow('SGST Total:', `₹${Number(invoice.sgst_amount).toFixed(2)}`, sumY);
        sumY += 16;
      }

      renderSummaryRow('Round Off:', `${invoice.round_off >= 0 ? '+' : ''}₹${Number(invoice.round_off).toFixed(2)}`, sumY);
      sumY += 18;

      renderSummaryRow('GRAND TOTAL:', `₹${Number(invoice.grand_total).toFixed(2)}`, sumY, true, true);
      sumY += 24;

      renderSummaryRow('Paid Amount:', `₹${Number(invoice.paid_amount).toFixed(2)}`, sumY, true);
      sumY += 16;
      renderSummaryRow('Balance Due:', `₹${Number(invoice.balance_amount).toFixed(2)}`, sumY, true);

      // Signature Area (Bottom Right)
      const sigTop = summaryTop + 210;
      doc.rect(355, sigTop, 210, 70).fillAndStroke('#ffffff', borderColor);
      doc.fillColor(secondaryColor).fontSize(7.5).font('Helvetica')
        .text(`For ${settings.company_name || 'Acme Solutions'}`, 365, sigTop + 8, { width: 190, align: 'right' })
        .text('Authorized Signatory', 365, sigTop + 55, { width: 190, align: 'right' });

      // Footer
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
        .text('This is a Computer Generated Tax Invoice. Generated by GST Billing Management System.', 30, 805, { width: 535, align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          fileName: filename,
          filePath,
          relativeUrl: `/public/invoices/${filename}`
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePdf
};
