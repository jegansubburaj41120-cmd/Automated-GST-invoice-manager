import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { invoiceService } from '../../services/invoiceService';
import { useSettings } from '../../context/SettingsContext';
import { INDIAN_STATES, formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';

export default function CreateInvoice() {
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected Customer & Invoice metadata
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState('Due in 15 Days');
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [notes, setNotes] = useState('Thank you for choosing our services!');

  // Items State
  const [items, setItems] = useState([
    {
      product_id: '',
      product_name: '',
      hsn_code: '',
      unit: 'NOS',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      gst_rate: 18.00
    }
  ]);

  // Load initial customers and products
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [custRes, prodRes] = await Promise.all([
          customerService.getAllSimple(),
          productService.getAllSimple()
        ]);
        if (custRes.success) setCustomers(custRes.data);
        if (prodRes.success) setProducts(prodRes.data);

        // Set default place of supply to company state
        if (settings?.state) {
          setPlaceOfSupply(settings.state);
        }
      } catch (err) {
        toast.error('Failed to load customers or products catalog.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [settings]);

  // Handle Customer Selection
  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    const found = customers.find((c) => String(c.id) === String(custId));
    if (found) {
      setSelectedCustomer(found);
      setPlaceOfSupply(found.state);
    } else {
      setSelectedCustomer(null);
    }
  };

  // Determine Inter-state vs Intra-state
  const companyStateCode = settings?.state_code || '27';
  const customerStateCode = selectedCustomer?.state_code || companyStateCode;
  const isInterState = String(companyStateCode).trim().padStart(2, '0') !== String(customerStateCode).trim().padStart(2, '0');

  // Handle Item Row Changes
  const handleItemProductSelect = (index, productId) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    const newItems = [...items];
    if (prod) {
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        product_name: prod.name,
        hsn_code: prod.hsn_code,
        unit: prod.unit || 'NOS',
        unit_price: Number(prod.selling_price) || 0,
        gst_rate: Number(prod.gst_rate) || 18.00
      };
    } else {
      newItems[index].product_id = '';
    }
    setItems(newItems);
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        product_id: '',
        product_name: '',
        hsn_code: '',
        unit: 'NOS',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        gst_rate: 18.00
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.warning('An invoice requires at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalItemDiscount = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const computedItems = items.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discPercent = parseFloat(item.discount_percent) || 0;
      const gst = parseFloat(item.gst_rate) || 0;

      const rawSub = qty * price;
      const discAmt = (rawSub * discPercent) / 100;
      const taxable = rawSub - discAmt;

      let cgst = 0, sgst = 0, igst = 0;
      if (isInterState) {
        igst = (taxable * gst) / 100;
      } else {
        cgst = (taxable * (gst / 2)) / 100;
        sgst = (taxable * (gst / 2)) / 100;
      }

      const total = taxable + cgst + sgst + igst;

      subtotal += rawSub;
      totalItemDiscount += discAmt;
      taxableAmount += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;

      return {
        ...item,
        taxable_value: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        line_total: total
      };
    });

    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const invDiscount = parseFloat(invoiceDiscount) || 0;
    const rawGrandTotal = taxableAmount + totalTax - invDiscount;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = roundedGrandTotal - rawGrandTotal;

    return {
      computedItems,
      subtotal,
      totalItemDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      invDiscount,
      roundOff,
      grandTotal: roundedGrandTotal
    };
  };

  const totals = calculateTotals();

  // Save and generate invoice
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer for this invoice.');
      return;
    }

    // Validate item rows
    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      if (!itm.product_name || !itm.product_name.trim()) {
        toast.error(`Please provide a description/name for item #${i + 1}.`);
        return;
      }
      if (Number(itm.quantity) <= 0) {
        toast.error(`Quantity for item #${i + 1} must be greater than 0.`);
        return;
      }
      if (Number(itm.unit_price) < 0) {
        toast.error(`Unit price for item #${i + 1} cannot be negative.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_id: selectedCustomerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: paymentTerms,
        place_of_supply: placeOfSupply,
        invoice_discount: invoiceDiscount,
        notes,
        items
      };

      const res = await invoiceService.createInvoice(payload);

      if (res.success) {
        toast.success(res.message || 'Invoice generated successfully!');
        // Open PDF in new tab if available
        if (res.pdfUrl) {
          window.open(res.pdfUrl, '_blank');
        }
        navigate(`/invoices/${res.invoiceId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Create Tax Invoice</h4>
          <p className="text-muted small mb-0">Generate GST compliant invoice with automatic CGST/SGST or IGST tax calculations</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/invoices')}>
          <i className="bi bi-arrow-left me-1"></i> Back to Invoices
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Main Invoice Form (Left 8 Cols) */}
          <div className="col-12 col-xl-8">
            {/* Customer & Invoice Meta Details Card */}
            <div className="dashboard-card p-4 mb-4">
              <h6 className="fw-bold text-dark brand-font mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-building text-primary"></i> Customer & Invoice Details
              </h6>

              <div className="row g-3">
                {/* Customer Select */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Select Customer <span className="text-danger">*</span></label>
                  <select
                    className="form-select form-select-custom fw-semibold"
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.state} - {c.customer_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Place of Supply */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Place of Supply <span className="text-danger">*</span></label>
                  <select
                    className="form-select form-select-custom"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    required
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                {/* Selected Customer Quick Box */}
                {selectedCustomer && (
                  <div className="col-12">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="row g-2 small">
                        <div className="col-sm-6">
                          <strong>Billing Address:</strong> {selectedCustomer.billing_address}, {selectedCustomer.city} - {selectedCustomer.pincode}
                        </div>
                        <div className="col-sm-3">
                          <strong>State:</strong> {selectedCustomer.state} (Code: {selectedCustomer.state_code})
                        </div>
                        <div className="col-sm-3">
                          <strong>GSTIN:</strong> {selectedCustomer.gstin || 'Unregistered'}
                        </div>
                      </div>
                      {/* GST Tax Type Banner */}
                      <div className="mt-2 pt-2 border-top">
                        <span className={`badge ${isInterState ? 'bg-info-subtle text-info-emphasis border border-info' : 'bg-primary-subtle text-primary border border-primary'} px-2 py-1`}>
                          <i className={`bi ${isInterState ? 'bi-globe2' : 'bi-house-door-fill'} me-1`}></i>
                          {isInterState ? 'Inter-State Supply (IGST Applicable)' : 'Intra-State Supply (CGST + SGST Applicable)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates & Terms */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-7">Invoice Date <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control form-control-custom"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-7">Due Date <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control form-control-custom"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-7">Payment Terms</label>
                  <select
                    className="form-select form-select-custom"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Due in 15 Days">Due in 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Advance Payment">Advance Payment</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="dashboard-card p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-dark brand-font mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-list-check text-primary"></i> Invoice Line Items
                </h6>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItemRow}>
                  <i className="bi bi-plus-lg me-1"></i> Add Item
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th style={{ width: '3%' }}>#</th>
                      <th style={{ width: '30%' }}>Item / Product</th>
                      <th style={{ width: '12%' }}>HSN/SAC</th>
                      <th style={{ width: '10%' }}>Qty</th>
                      <th style={{ width: '15%' }}>Rate (₹)</th>
                      <th style={{ width: '10%' }}>Disc %</th>
                      <th style={{ width: '10%' }}>GST %</th>
                      <th style={{ width: '10%' }} className="text-end">Total (₹)</th>
                      <th style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const comp = totals.computedItems[idx];
                      return (
                        <tr key={idx}>
                          <td className="text-center fw-bold">{idx + 1}</td>
                          <td>
                            <select
                              className="form-select form-select-sm mb-1"
                              value={item.product_id || ''}
                              onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                            >
                              <option value="">-- Choose from Catalog or Type below --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Product description..."
                              value={item.product_name}
                              onChange={(e) => handleItemFieldChange(idx, 'product_name', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm font-monospace"
                              placeholder="84713010"
                              value={item.hsn_code}
                              onChange={(e) => handleItemFieldChange(idx, 'hsn_code', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-control form-control-sm fw-semibold"
                              value={item.unit_price}
                              onChange={(e) => handleItemFieldChange(idx, 'unit_price', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              className="form-control form-control-sm"
                              value={item.discount_percent}
                              onChange={(e) => handleItemFieldChange(idx, 'discount_percent', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm fw-semibold"
                              value={item.gst_rate}
                              onChange={(e) => handleItemFieldChange(idx, 'gst_rate', parseFloat(e.target.value))}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="text-end fw-bold text-dark">
                            {formatCurrency(comp ? comp.line_total : 0)}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm text-danger p-0 border-0"
                              onClick={() => removeItemRow(idx)}
                              title="Remove item"
                            >
                              <i className="bi bi-trash fs-6"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={addItemRow}>
                <i className="bi bi-plus-lg me-1"></i> Add Another Line Item
              </button>
            </div>

            {/* Notes & Terms */}
            <div className="dashboard-card p-4">
              <label className="form-label fw-semibold fs-7">Invoice Remarks / Customer Notes</label>
              <textarea
                className="form-control form-control-custom"
                rows="2"
                placeholder="Payment instructions or special remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          {/* Right Summary Panel (Right 4 Cols) */}
          <div className="col-12 col-xl-4">
            <div className="dashboard-card p-4 sticky-top" style={{ top: '90px' }}>
              <h6 className="fw-bold text-dark brand-font mb-3 pb-2 border-bottom d-flex align-items-center gap-2">
                <i className="bi bi-calculator-fill text-primary"></i> Invoice Tax Summary
              </h6>

              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Item Subtotal:</span>
                <span className="fw-semibold text-dark">{formatCurrency(totals.subtotal)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Item Discounts:</span>
                <span className="text-danger">- {formatCurrency(totals.totalItemDiscount)}</span>
              </div>

              <div className="d-flex justify-content-between mb-2 small pt-2 border-top">
                <span className="fw-bold text-dark">Taxable Amount:</span>
                <span className="fw-bold text-dark">{formatCurrency(totals.taxableAmount)}</span>
              </div>

              {/* Tax Breakdowns */}
              {isInterState ? (
                <div className="p-2 bg-light rounded-2 my-2 small">
                  <div className="d-flex justify-content-between text-secondary">
                    <span>IGST Total:</span>
                    <span className="fw-semibold">{formatCurrency(totals.igstTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-light rounded-2 my-2 small">
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>CGST Total:</span>
                    <span className="fw-semibold">{formatCurrency(totals.cgstTotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary">
                    <span>SGST Total:</span>
                    <span className="fw-semibold">{formatCurrency(totals.sgstTotal)}</span>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Total GST Tax:</span>
                <span className="fw-bold text-teal">{formatCurrency(totals.totalTax)}</span>
              </div>

              {/* Extra Invoice Discount */}
              <div className="mb-3 pt-2 border-top">
                <label className="form-label fw-semibold fs-7 small mb-1">Extra Discount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control form-control-sm"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-between mb-3 small">
                <span className="text-muted">Round Off:</span>
                <span className="text-muted">{totals.roundOff >= 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</span>
              </div>

              {/* Grand Total Box */}
              <div className="p-3 rounded-3 mb-4 text-center border" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
                <small className="text-primary text-uppercase fw-bold d-block">Grand Total</small>
                <h3 className="fw-bold text-primary mb-0 brand-font">{formatCurrency(totals.grandTotal)}</h3>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-primary-custom py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Generating PDF & Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle fs-5"></i>
                      <span>Generate & Save Invoice</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => navigate('/invoices')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
