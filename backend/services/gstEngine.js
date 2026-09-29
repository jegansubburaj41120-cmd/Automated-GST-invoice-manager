/**
 * GST Calculation Engine
 * Handles accurate line item taxation, inter-state vs intra-state routing, and round-offs.
 */

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item level GST breakdown
 * @param {Object} item
 * @param {boolean} isInterState
 */
function calculateItemGst(item, isInterState) {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  const discountPercent = parseFloat(item.discount_percent) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;

  const itemSubtotal = round2(quantity * unitPrice);
  const discountAmount = round2((itemSubtotal * discountPercent) / 100);
  const taxableValue = round2(itemSubtotal - discountAmount);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = gstRate;
    igstAmount = round2((taxableValue * igstRate) / 100);
  } else {
    cgstRate = round2(gstRate / 2);
    cgstAmount = round2((taxableValue * cgstRate) / 100);
    sgstRate = round2(gstRate / 2);
    sgstAmount = round2((taxableValue * sgstRate) / 100);
  }

  const lineTotal = round2(taxableValue + cgstAmount + sgstAmount + igstAmount);

  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    taxable_value: taxableValue,
    gst_rate: gstRate,
    cgst_rate: cgstRate,
    cgst_amount: cgstAmount,
    sgst_rate: sgstRate,
    sgst_amount: sgstAmount,
    igst_rate: igstRate,
    igst_amount: igstAmount,
    line_total: lineTotal
  };
}

/**
 * Calculates complete Invoice totals given items and company state vs customer state
 * @param {Array} rawItems
 * @param {string} companyStateCode
 * @param {string} customerStateCode
 * @param {number} invoiceDiscount
 */
function calculateInvoiceTotals(rawItems, companyStateCode, customerStateCode, invoiceDiscount = 0) {
  const compCode = String(companyStateCode || '').trim().padStart(2, '0');
  const custCode = String(customerStateCode || '').trim().padStart(2, '0');
  
  // Inter-state if state codes are different
  const isInterState = compCode !== custCode;

  let subtotal = 0;
  let totalItemDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  const processedItems = rawItems.map(item => {
    const calc = calculateItemGst(item, isInterState);
    subtotal += round2(calc.quantity * calc.unit_price);
    totalItemDiscount += calc.discount_amount;
    taxableAmount += calc.taxable_value;
    cgstAmount += calc.cgst_amount;
    sgstAmount += calc.sgst_amount;
    igstAmount += calc.igst_amount;
    return calc;
  });

  subtotal = round2(subtotal);
  totalItemDiscount = round2(totalItemDiscount);
  taxableAmount = round2(taxableAmount);
  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);

  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
  const extraDiscount = round2(parseFloat(invoiceDiscount) || 0);
  const rawGrandTotal = round2(taxableAmount + totalTax - extraDiscount);
  
  // Standard Indian accounting round-off to nearest Rupee
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = round2(roundedGrandTotal - rawGrandTotal);

  return {
    isInterState,
    items: processedItems,
    subtotal,
    discountAmount: round2(totalItemDiscount + extraDiscount),
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    roundOff,
    grandTotal: roundedGrandTotal
  };
}

module.exports = {
  round2,
  calculateItemGst,
  calculateInvoiceTotals
};
