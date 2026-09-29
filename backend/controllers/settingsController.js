const { query } = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Get company settings
 */
async function getSettings(req, res, next) {
  try {
    const rows = await query('SELECT * FROM settings WHERE id = 1');
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Settings not configured.' });
    }
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update company settings (Admin only)
 */
async function updateSettings(req, res, next) {
  try {
    const {
      company_name, company_logo, business_address, city, state, state_code,
      pincode, phone, email, website, gstin, pan, bank_name,
      account_number, ifsc, upi_id, invoice_prefix, receipt_prefix,
      terms_conditions, authorized_signatory, designation
    } = req.body;

    const formattedGstin = gstin ? gstin.trim().toUpperCase() : '';
    let derivedPan = pan ? pan.trim().toUpperCase() : '';
    if (formattedGstin && formattedGstin.length === 15 && !derivedPan) {
      derivedPan = formattedGstin.substring(2, 12);
    }

    await query(
      `UPDATE settings SET
        company_name = ?, company_logo = ?, business_address = ?, city = ?,
        state = ?, state_code = ?, pincode = ?, phone = ?, email = ?,
        website = ?, gstin = ?, pan = ?, bank_name = ?, account_number = ?,
        ifsc = ?, upi_id = ?, invoice_prefix = ?, receipt_prefix = ?,
        terms_conditions = ?, authorized_signatory = ?, designation = ?
       WHERE id = 1`,
      [
        company_name ? company_name.trim() : 'Acme GST Solutions Pvt Ltd',
        company_logo || '',
        business_address ? business_address.trim() : '',
        city ? city.trim() : '',
        state ? state.trim() : 'Maharashtra',
        state_code ? state_code.trim().padStart(2, '0') : '27',
        pincode ? pincode.trim() : '',
        phone ? phone.trim() : '',
        email ? email.trim() : '',
        website ? website.trim() : '',
        formattedGstin,
        derivedPan,
        bank_name ? bank_name.trim() : '',
        account_number ? account_number.trim() : '',
        ifsc ? ifsc.trim().toUpperCase() : '',
        upi_id ? upi_id.trim() : '',
        invoice_prefix ? invoice_prefix.trim().toUpperCase() : 'INV',
        receipt_prefix ? receipt_prefix.trim().toUpperCase() : 'REC',
        terms_conditions ? terms_conditions.trim() : '',
        authorized_signatory ? authorized_signatory.trim() : '',
        designation ? designation.trim() : ''
      ]
    );

    await logAudit(req.user, 'UPDATE_SETTINGS', 'SETTINGS', 1, 'Updated company & banking settings', req.ip);

    const updated = (await query('SELECT * FROM settings WHERE id = 1'))[0];

    res.json({
      success: true,
      message: 'Company settings updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
