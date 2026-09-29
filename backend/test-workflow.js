const { query } = require('./config/db');
const { calculateInvoiceTotals } = require('./services/gstEngine');
const { generateInvoiceQRCode, generateReceiptQRCode } = require('./services/qrCodeService');
const { generateInvoicePdf } = require('./services/invoicePdfService');
const { generateReceiptPdf } = require('./services/receiptPdfService');
const { numberToWords } = require('./utils/numberToWords');

async function testAllWorkflows() {
  console.log('🧪 Running Comprehensive System Verification Tests...\n');

  // Test 1: numberToWords utility
  console.log('1. Testing Indian Currency Words Converter:');
  console.log('   ₹ 1,54,230.50 ->', numberToWords(154230.50));
  console.log('   ₹ 10,00,000 ->', numberToWords(1000000));

  // Test 2: Intra-State GST Calculation (Maharashtra to Maharashtra)
  console.log('\n2. Testing Intra-State GST Calculation (CGST 9% + SGST 9%):');
  const intraItems = [
    { product_name: 'Test Laptop', quantity: 1, unit_price: 10000, discount_percent: 0, gst_rate: 18 }
  ];
  const intraRes = calculateInvoiceTotals(intraItems, '27', '27');
  console.log('   Is Inter-State:', intraRes.isInterState);
  console.log('   Taxable Amount:', intraRes.taxableAmount);
  console.log('   CGST:', intraRes.cgstAmount, '| SGST:', intraRes.sgstAmount, '| IGST:', intraRes.igstAmount);
  console.log('   Grand Total:', intraRes.grandTotal);
  if (intraRes.cgstAmount === 900 && intraRes.sgstAmount === 900 && intraRes.igstAmount === 0 && intraRes.grandTotal === 11800) {
    console.log('   ✅ Intra-State GST verified successfully!');
  } else {
    throw new Error('Intra-state calculation failed.');
  }

  // Test 3: Inter-State GST Calculation (Maharashtra to Karnataka)
  console.log('\n3. Testing Inter-State GST Calculation (IGST 18%):');
  const interItems = [
    { product_name: 'Test Server', quantity: 1, unit_price: 10000, discount_percent: 0, gst_rate: 18 }
  ];
  const interRes = calculateInvoiceTotals(interItems, '27', '29');
  console.log('   Is Inter-State:', interRes.isInterState);
  console.log('   Taxable Amount:', interRes.taxableAmount);
  console.log('   CGST:', interRes.cgstAmount, '| SGST:', interRes.sgstAmount, '| IGST:', interRes.igstAmount);
  console.log('   Grand Total:', interRes.grandTotal);
  if (interRes.cgstAmount === 0 && interRes.sgstAmount === 0 && interRes.igstAmount === 1800 && interRes.grandTotal === 11800) {
    console.log('   ✅ Inter-State GST verified successfully!');
  } else {
    throw new Error('Inter-state calculation failed.');
  }

  // Test 4: Database verification
  console.log('\n4. Testing MySQL Database Data Integrity:');
  const [users] = await query('SELECT COUNT(*) as count FROM users');
  const [customers] = await query('SELECT COUNT(*) as count FROM customers');
  const [products] = await query('SELECT COUNT(*) as count FROM products');
  const [invoices] = await query('SELECT COUNT(*) as count FROM invoices');
  const [receipts] = await query('SELECT COUNT(*) as count FROM receipts');
  console.log(`   Users: ${users.count}, Customers: ${customers.count}, Products: ${products.count}, Invoices: ${invoices.count}, Receipts: ${receipts.count}`);

  if (users.count >= 2 && customers.count >= 5 && products.count >= 10 && invoices.count >= 3 && receipts.count >= 2) {
    console.log('   ✅ Database records verified successfully!');
  } else {
    throw new Error('Database records count check failed.');
  }

  console.log('\n🎉 ALL SYSTEM VERIFICATION CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
}

testAllWorkflows().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
