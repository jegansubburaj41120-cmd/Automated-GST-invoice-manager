const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { numberToWords } = require('../utils/numberToWords');

/**
 * Generate a professional A4 GST Payment Receipt PDF
 */
function generateReceiptPdf(receipt, invoice, customer, payment, settings, qrDataUrl = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        bufferPages: true
      });

      const safeRecNo = (receipt.receipt_number || 'REC_000').replace(/[\/\\]/g, '_');
      const filename = `${safeRecNo}.pdf`;
      const receiptsDir = path.join(__dirname, '../public/receipts');

      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filePath = path.join(receiptsDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = '#0f766e';   // Emerald / Teal
      const secondaryColor = '#334155'; // Dark Slate
      const borderColor = '#cbd5e1';    // Slate 300
      const lightBg = '#f0fdfa';        // Mint 50
      const headerBg = '#134e4a';       // Deep Teal

      // 1. TOP HEADER BANNER
      doc.rect(30, 30, 535, 85).fillAndStroke(lightBg, borderColor);

      // Company Info (Left)
      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold')
        .text(settings.company_name || 'Acme GST Solutions Pvt Ltd', 45, 42);

      doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica')
        .text(`${settings.business_address || ''}, ${settings.city || ''} - ${settings.pincode || ''}, ${settings.state || ''}`, 45, 62, { width: 300 })
        .text(`Phone: ${settings.phone || ''} | Email: ${settings.email || ''}`, 45, 82)
        .text(`GSTIN: ${settings.gstin || ''} | PAN: ${settings.pan || ''}`, 45, 94);

      // Receipt Badge & Header (Right)
      doc.rect(370, 38, 185, 26).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', 370, 45, { width: 185, align: 'center' });

      doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica')
        .text(`Receipt No: `, 370, 72)
        .font('Helvetica-Bold').text(`${receipt.receipt_number}`, 435, 72)
        .font('Helvetica').text(`Receipt Date: `, 370, 86)
        .font('Helvetica-Bold').text(`${new Date(receipt.receipt_date).toLocaleDateString('en-IN')}`, 435, 86);

      // 2. RECEIVED FROM & INVOICE REFERENCE
      doc.rect(30, 125, 260, 95).fillAndStroke('#ffffff', borderColor);
      doc.rect(295, 125, 270, 95).fillAndStroke('#ffffff', borderColor);

      // Received From (Left Box)
      doc.rect(30, 125, 260, 20).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
        .text('RECEIVED FROM', 40, 131);

      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold')
        .text(customer.name || 'Valued Customer', 40, 150);

      doc.font('Helvetica').fontSize(8.5)
        .text(`${customer.billing_address || ''}, ${customer.city || ''} - ${customer.pincode || ''}`, 40, 164, { width: 240 })
        .text(`State: ${customer.state || ''} (Code: ${customer.state_code || ''})`, 40, 186)
        .text(`Phone: ${customer.phone || ''} | GSTIN: ${customer.gstin || 'Unregistered'}`, 40, 198);

      // Invoice & Transaction Details (Right Box)
      doc.rect(295, 125, 270, 20).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
        .text('PAYMENT & INVOICE REFERENCE', 305, 131);

      doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica')
        .text('Invoice Number:', 305, 150).font('Helvetica-Bold').text(`${invoice.invoice_number}`, 400, 150)
        .font('Helvetica').text('Invoice Date:', 305, 164).font('Helvetica-Bold').text(`${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`, 400, 164)
        .font('Helvetica').text('Payment Method:', 305, 178).font('Helvetica-Bold').text(`${payment.payment_method || 'UPI'}`, 400, 178)
        .font('Helvetica').text('Transaction Ref:', 305, 192).font('Helvetica-Bold').text(`${payment.transaction_reference || 'N/A'}`, 400, 192);

      // 3. LARGE AMOUNT RECEIVED HIGHLIGHT BOX
      doc.rect(30, 230, 535, 60).fillAndStroke('#ecfdf5', '#a7f3d0');

      doc.fillColor('#065f46').fontSize(10).font('Helvetica-Bold')
        .text('AMOUNT RECEIVED', 45, 240);

      doc.fillColor('#047857').fontSize(18).font('Helvetica-Bold')
        .text(`₹ ${Number(receipt.amount).toFixed(2)}`, 45, 256);

      const words = numberToWords(receipt.amount);
      doc.fillColor('#065f46').fontSize(8.5).font('Helvetica-Bold')
        .text(`(${words})`, 210, 262, { width: 340 });

      // 4. PAYMENT & INVOICE ACCOUNT SUMMARY TABLE
      const tableY = 300;
      doc.rect(30, tableY, 535, 22).fill(headerBg);
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Invoice Total', 45, tableY + 7);
      doc.text('Previously Paid', 170, tableY + 7);
      doc.text('Current Payment', 295, tableY + 7);
      doc.text('Remaining Balance', 420, tableY + 7);

      const prevPaid = Math.max(0, (invoice.paid_amount || 0) - (receipt.amount || 0));
      const balanceAfter = invoice.balance_amount || 0;

      doc.rect(30, tableY + 22, 535, 30).fillAndStroke('#ffffff', borderColor);
      doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold');
      doc.text(`₹${Number(invoice.grand_total).toFixed(2)}`, 45, tableY + 32);
      doc.text(`₹${Number(prevPaid).toFixed(2)}`, 170, tableY + 32);
      doc.fillColor('#047857').text(`₹${Number(receipt.amount).toFixed(2)}`, 295, tableY + 32);
      doc.fillColor(balanceAfter <= 0 ? '#059669' : '#dc2626').text(`₹${Number(balanceAfter).toFixed(2)}`, 420, tableY + 32);

      // Status Badge Banner
      const statusY = tableY + 60;
      const isFull = balanceAfter <= 0;
      doc.rect(30, statusY, 535, 26).fill(isFull ? '#dcfce7' : '#fef3c7');
      doc.fillColor(isFull ? '#15803d' : '#b45309').fontSize(9).font('Helvetica-Bold')
        .text(`INVOICE STATUS: ${isFull ? 'PAID IN FULL (NIL BALANCE)' : `PARTIALLY PAID (BALANCE DUE: ₹${Number(balanceAfter).toFixed(2)})`}`, 45, statusY + 8, { align: 'center', width: 505 });

      // 5. BANK & QR CODE & SIGNATURE
      const footerBoxY = 400;

      // Left Box: Bank Details + Verification QR Code
      doc.rect(30, footerBoxY, 320, 175).fillAndStroke('#ffffff', borderColor);
      doc.rect(30, footerBoxY, 320, 18).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
        .text('BANK & VERIFICATION DETAILS', 40, footerBoxY + 5);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text(`Bank Name: `, 40, footerBoxY + 30).font('Helvetica-Bold').text(settings.bank_name || 'State Bank of India', 110, footerBoxY + 30)
        .font('Helvetica').text(`Account No: `, 40, footerBoxY + 44).font('Helvetica-Bold').text(settings.account_number || '123456789012', 110, footerBoxY + 44)
        .font('Helvetica').text(`IFSC Code: `, 40, footerBoxY + 58).font('Helvetica-Bold').text(settings.ifsc || 'SBIN0001234', 110, footerBoxY + 58)
        .font('Helvetica').text(`UPI ID: `, 40, footerBoxY + 72).font('Helvetica-Bold').text(settings.upi_id || 'acmegst@sbi', 110, footerBoxY + 72);

      // Notes
      if (payment.notes) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
          .text(`Notes: ${payment.notes}`, 40, footerBoxY + 92, { width: 190 });
      }

      // QR Code
      if (qrDataUrl) {
        try {
          doc.image(qrDataUrl, 245, footerBoxY + 25, { width: 90, height: 90 });
          doc.fontSize(7).font('Helvetica').fillColor('#0f766e').text('Scan to Verify Receipt', 245, footerBoxY + 120, { width: 90, align: 'center' });
        } catch (qrErr) {
          console.error('Error attaching Receipt QR:', qrErr);
        }
      }

      doc.rect(30, footerBoxY + 140, 320, 35).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
        .text('This receipt confirms receipt of payment against the cited Tax Invoice.', 40, footerBoxY + 146, { width: 300 })
        .text('Thank you for your business!', 40, footerBoxY + 158);

      // Right Box: Signature
      doc.rect(355, footerBoxY, 210, 175).fillAndStroke('#ffffff', borderColor);
      doc.rect(355, footerBoxY, 210, 18).fill('#f1f5f9');
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
        .text('AUTHORIZED SIGNATORY', 365, footerBoxY + 5);

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
        .text(`For ${settings.company_name || 'Acme Solutions Pvt Ltd'}`, 365, footerBoxY + 40, { width: 190, align: 'center' })
        .text(`${settings.authorized_signatory || 'Authorized Signatory'}`, 365, footerBoxY + 130, { width: 190, align: 'center' })
        .font('Helvetica-Bold').text(`(${settings.designation || 'Accounts Manager'})`, 365, footerBoxY + 145, { width: 190, align: 'center' });

      // Footer
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
        .text('Official Payment Receipt • Generated by GST Invoice & Receipt Management System', 30, 805, { width: 535, align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          fileName: filename,
          filePath,
          relativeUrl: `/public/receipts/${filename}`
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
  generateReceiptPdf
};
