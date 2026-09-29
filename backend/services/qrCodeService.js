const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generate QR code for Invoice (UPI Payment string + GST payload)
 */
async function generateInvoiceQRCode(invoiceData, settings) {
  try {
    const upiId = settings.upi_id || 'acmegst@sbi';
    const payeeName = encodeURIComponent(settings.company_name || 'GST Billing');
    const amount = invoiceData.balance_amount > 0 ? invoiceData.balance_amount : invoiceData.grand_total;
    const note = encodeURIComponent(`Payment for Invoice ${invoiceData.invoice_number}`);
    
    // UPI payment deep link format
    const upiUri = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;

    const qrDir = path.join(__dirname, '../public/qrcodes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const safeNumber = invoiceData.invoice_number.replace(/[\/\\]/g, '_');
    const filename = `QR_INV_${safeNumber}_${Date.now()}.png`;
    const filePath = path.join(qrDir, filename);

    await QRCode.toFile(filePath, upiUri, {
      width: 200,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    const dataUrl = await QRCode.toDataURL(upiUri, { width: 200, margin: 1 });

    return {
      fileName: filename,
      relativeUrl: `/public/qrcodes/${filename}`,
      filePath,
      dataUrl,
      rawString: upiUri
    };
  } catch (error) {
    console.error('Error generating Invoice QR code:', error);
    return null;
  }
}

/**
 * Generate QR code for Payment Receipt verification
 */
async function generateReceiptQRCode(receiptData, settings) {
  try {
    const payload = JSON.stringify({
      company: settings.company_name,
      gstin: settings.gstin,
      receiptNo: receiptData.receipt_number,
      invoiceNo: receiptData.invoice_number,
      amount: receiptData.amount,
      date: receiptData.receipt_date,
      paymentMethod: receiptData.payment_method,
      ref: receiptData.transaction_reference || 'N/A'
    });

    const qrDir = path.join(__dirname, '../public/qrcodes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const safeNumber = receiptData.receipt_number.replace(/[\/\\]/g, '_');
    const filename = `QR_REC_${safeNumber}_${Date.now()}.png`;
    const filePath = path.join(qrDir, filename);

    await QRCode.toFile(filePath, payload, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f766e',
        light: '#ffffff'
      }
    });

    const dataUrl = await QRCode.toDataURL(payload, { width: 200, margin: 1 });

    return {
      fileName: filename,
      relativeUrl: `/public/qrcodes/${filename}`,
      filePath,
      dataUrl,
      payload
    };
  } catch (error) {
    console.error('Error generating Receipt QR code:', error);
    return null;
  }
}

module.exports = {
  generateInvoiceQRCode,
  generateReceiptQRCode
};
