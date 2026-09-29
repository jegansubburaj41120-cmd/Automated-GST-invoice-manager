import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import { useSettings } from '../../context/SettingsContext';
import { INDIAN_STATES } from '../../utils/formatters';
import { isValidGSTIN, isValidPAN } from '../../utils/gstValidators';
import { toast } from 'react-toastify';

export default function Settings() {
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const initialForm = {
    company_name: '',
    company_logo: '',
    business_address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    gstin: '',
    pan: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    upi_id: '',
    invoice_prefix: 'INV',
    receipt_prefix: 'REC',
    terms_conditions: '',
    authorized_signatory: '',
    designation: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await settingsService.getSettings();
        if (res.success && res.data) {
          setFormData(res.data);
        }
      } catch (err) {
        toast.error('Failed to load company settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleStateChange = (e) => {
    const stName = e.target.value;
    const found = INDIAN_STATES.find((s) => s.name === stName);
    setFormData((prev) => ({
      ...prev,
      state: stName,
      state_code: found ? found.code : '00'
    }));
  };

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    let autoPan = formData.pan;
    if (val.length >= 12 && !autoPan) {
      autoPan = val.substring(2, 12);
    }
    setFormData((prev) => ({
      ...prev,
      gstin: val,
      pan: autoPan
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.gstin && !isValidGSTIN(formData.gstin)) {
      toast.error('Invalid GSTIN format. Must be 15 alphanumeric characters (e.g. 27AAACA1234F1Z5).');
      return;
    }

    if (formData.pan && !isValidPAN(formData.pan)) {
      toast.error('Invalid PAN format (e.g. AAACA1234F).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await settingsService.updateSettings(formData);
      if (res.success) {
        toast.success('Company settings saved successfully! New invoices & receipts will use these details.');
        refreshSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Company & GST Settings</h4>
          <p className="text-muted small mb-0">Configure your business profile, GSTIN, banking details, and PDF templates</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Business Profile */}
          <div className="col-12 col-lg-6">
            <div className="dashboard-card p-4 h-100">
              <h6 className="fw-bold text-dark brand-font mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-building text-primary"></i> Company Identity & Tax Details
              </h6>

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-semibold fs-7">Company Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-custom fw-bold"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Company GSTIN <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace fw-bold text-primary"
                    value={formData.gstin}
                    onChange={handleGstinChange}
                    maxLength="15"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Company PAN <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace fw-semibold"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    maxLength="10"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Registered State <span className="text-danger">*</span></label>
                  <select
                    className="form-select form-select-custom fw-semibold"
                    value={formData.state}
                    onChange={handleStateChange}
                    required
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>{s.name} (Code: {s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">GST State Code</label>
                  <input
                    type="text"
                    className="form-control form-control-custom bg-light fw-bold"
                    value={formData.state_code}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">City</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">PIN Code</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold fs-7">Registered Business Address <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control form-control-custom"
                    rows="2"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Contact Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Billing Email</label>
                  <input
                    type="email"
                    className="form-control form-control-custom"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank & Settlement Details */}
          <div className="col-12 col-lg-6">
            <div className="dashboard-card p-4 h-100">
              <h6 className="fw-bold text-dark brand-font mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-bank2 text-teal"></i> Banking & Settlement Details
              </h6>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Bank Name</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    placeholder="e.g. State Bank of India"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Account Number</label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">IFSC Code</label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace text-uppercase"
                    placeholder="SBIN0001234"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">UPI ID / VPA</label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace"
                    placeholder="company@bank"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Invoice Number Prefix</label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace text-uppercase"
                    value={formData.invoice_prefix}
                    onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Receipt Number Prefix</label>
                  <input
                    type="text"
                    className="form-control form-control-custom font-monospace text-uppercase"
                    value={formData.receipt_prefix}
                    onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Authorized Signatory Name</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    value={formData.authorized_signatory}
                    onChange={(e) => setFormData({ ...formData, authorized_signatory: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold fs-7">Signatory Designation</label>
                  <input
                    type="text"
                    className="form-control form-control-custom"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold fs-7">Terms & Conditions (PDF)</label>
                  <textarea
                    className="form-control form-control-custom"
                    rows="2"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 text-end">
            <button
              type="submit"
              className="btn btn-primary-custom px-5 py-2.5 fw-bold"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
