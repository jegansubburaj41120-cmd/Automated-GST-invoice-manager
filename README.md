# GST Invoice & Receipt Management System

> Production-Ready Full-Stack GST Invoicing, Payment Tracking, and Payment Receipt Management System built with React, Node.js/Express, MySQL, PDFKit, and QRCode.

---

## 🌟 Overview & Purpose

The **GST Invoice & Receipt Management System** is a professional business billing solution engineered specifically for Indian GST compliance. 

### Key Highlight:
When a customer pays an invoice (either full or partial advance/installment), the system automatically creates an **official Payment Receipt** with a unique financial-year sequence number (`REC/2026-27/0001`), updates the invoice balance in real time, generates an A4 PDF Receipt containing verified payment details and QR code, and updates the payment ledger.

---

## 🚀 Key Features

1. **GST Calculation Engine**:
   - **Intra-State Supply**: Calculates **CGST (GST Rate / 2)** + **SGST (GST Rate / 2)** when Customer State Code == Company State Code.
   - **Inter-State Supply**: Calculates **IGST (Full GST Rate)** when Customer State Code != Company State Code.
   - Accurate line discounts, taxable amounts, subtotal, invoice-level discounts, round-off, and grand totals.

2. **Official Document PDF Generation (PDFKit)**:
   - **Tax Invoice PDF**: A4 format, company branding & GSTIN, Bill To customer details, itemized HSN/SAC table, tax columns, amount in words (Lakhs/Crores), Bank details with UPI QR Code, and Authorized Signatory.
   - **Payment Receipt PDF**: A4 format, dedicated Payment Receipt header, receipt number & date, invoice reference, payment mode (Cash, UPI, Bank Transfer, Card, Cheque, Other), amount in figures and words, account progression table (Invoice Total, Previous Paid, Current Payment, Balance Due), status badge, and QR code verification.

3. **QR Code Verification**:
   - Invoices include a deep-link UPI payment QR code (`upi://pay?pa=...`).
   - Receipts include a tamper-proof verification QR code with payment metadata.

4. **Role-Based Access Control**:
   - **ADMIN**: Full access to Dashboard, Invoices, Receipts, Customers, Products, Financial Reports, Staff Management, Company Settings, and System Audit Logs.
   - **STAFF**: Access to Dashboard, Invoices, Receipts, Payment Recording, Customers, Products, and Basic Reports.

5. **Financial Reports & Analytics**:
   - **GSTR-1 Tax Report**: Itemized output tax liabilities with CGST, SGST, IGST, and aggregate totals.
   - **Sales Turnover Report**: Complete breakdown of gross sales, discounts, and net turnover.
   - **Customer Receivables / Outstanding Ledger**: Real-time list of pending balances.
   - **CSV Export & Print Support**.

6. **Executive Dashboard**:
   - 8 KPI summary cards (Total Sales, Total GST Collected, Invoices, Receipts, Paid Amount, Pending Receivables, Customers, Products).
   - Interactive charts with Chart.js (Monthly Sales & GST, Customer Revenue Share, Top Selling Products).
   - Recent Invoices and Recent Receipts tables with 1-click payment recording and receipt viewing.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, Bootstrap 5, Bootstrap Icons, Chart.js, React Router v6, Axios, React Toastify |
| **Backend** | Node.js, Express.js REST API, JWT Authentication, bcryptjs, Helmet, CORS, Rate Limiting, Express Validator |
| **Database** | MySQL 8.0+ (`mysql2/promise` connection pool) |
| **PDF Generation** | PDFKit |
| **QR Code** | QRCode |

---

## 📂 Project Structure

```
Automated-gst-invoice-manager/
├── backend/
│   ├── config/
│   │   ├── config.js               # Environment configuration
│   │   └── db.js                   # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js       # Login, register, profile
│   │   ├── customerController.js   # Customer CRUD & ledger
│   │   ├── productController.js    # Product & stock management
│   │   ├── invoiceController.js    # Invoice generation & numbering
│   │   ├── paymentController.js    # Payment recording & receipt trigger
│   │   ├── receiptController.js    # Receipt querying & PDF regeneration
│   │   ├── reportController.js     # GSTR-1, sales, and outstanding reports
│   │   ├── settingsController.js   # Company profile & bank settings
│   │   ├── userController.js       # Admin user management
│   │   └── auditController.js      # System audit logging
│   ├── database/
│   │   ├── schema.sql              # MySQL DDL with foreign keys & indexes
│   │   ├── initDb.js               # Table initialization script
│   │   └── seed.js                 # Realistic seed data populator
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT validation
│   │   ├── roleMiddleware.js       # Admin/Staff role guards
│   │   ├── auditLogger.js          # Audit logging helper
│   │   ├── errorHandler.js         # Unified error responses
│   │   └── validator.js            # Input validation rules
│   ├── routes/
│   ├── services/
│   │   ├── gstEngine.js            # GST calculation engine
│   │   ├── invoicePdfService.js    # PDFKit Tax Invoice generator
│   │   ├── receiptPdfService.js    # PDFKit Payment Receipt generator
│   │   └── qrCodeService.js        # QR code generation
│   ├── utils/
│   │   ├── numberToWords.js        # Indian currency words converter
│   │   └── financialYear.js        # FY document number generator
│   ├── public/
│   │   ├── invoices/               # Generated invoice PDFs
│   │   ├── receipts/               # Generated receipt PDFs
│   │   └── qrcodes/                # Generated QR code images
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             # StatCard, Pagination, PaymentModal, ReceiptViewModal
│   │   │   └── layout/             # Navbar, Sidebar, Layout wrapper
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SettingsContext.jsx
│   │   ├── pages/
│   │   │   ├── auth/Login.jsx
│   │   │   ├── dashboard/Dashboard.jsx
│   │   │   ├── customers/CustomerList.jsx
│   │   │   ├── products/ProductList.jsx
│   │   │   ├── invoices/ (CreateInvoice, InvoiceList, InvoiceDetail)
│   │   │   ├── receipts/ (ReceiptList, ReceiptDetail)
│   │   │   ├── payments/PaymentList.jsx
│   │   │   ├── reports/Reports.jsx
│   │   │   ├── settings/Settings.jsx
│   │   │   ├── users/UserList.jsx
│   │   │   └── audit/AuditLogList.jsx
│   │   ├── services/               # API service clients
│   │   ├── styles/custom.css       # Premium business stylesheet
│   │   ├── utils/                  # Formatters & GST validators
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── package-app.js                  # Automated ZIP packaging script
├── package.json                    # Root orchestration scripts
└── README.md
```

---

## 🔑 Demo Login Credentials

The database seeder automatically provides pre-configured credentials:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Administrator** | `admin@gstmanager.com` | `Admin@123` | Full Access (Settings, Users, Audits, Billing) |
| **Billing Staff** | `staff@gstmanager.com` | `Staff@123` | Operational Access (Invoices, Receipts, Customers) |

*(Quick 1-Click login buttons are also provided directly on the login screen for convenience).*

---

## ⚡ Step-by-Step Installation & Setup

### Prerequisites:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **MySQL Server**: v8.0 or higher (Running locally or on a remote host)

### 1. Database Setup:
1. Ensure your MySQL server is running.
2. In `backend/.env`, configure your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=gst_invoice_manager
   DB_PORT=3306
   JWT_SECRET=super_secret_gst_invoice_manager_jwt_key_2026_pro
   ```
3. Initialize the schema and seed demo records:
   ```bash
   cd backend
   npm run seed
   ```

### 2. Start the Backend Server:
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

### 3. Start the Frontend Application:
```bash
cd frontend
npm run dev
# Application starts at http://localhost:5173
```

---

## 🔄 Complete End-to-End Workflow

```
1. Login (Admin / Staff)
      ↓
2. Dashboard (Real-time turnover, GST collection, and pending balance cards)
      ↓
3. Create Customer (Select State / GSTIN → auto sets State Code and Tax Type)
      ↓
4. Create Product / Service (Set HSN Code, Selling Price, and GST Rate: 0%, 5%, 12%, 18%, 28%)
      ↓
5. Create Tax Invoice:
   - Select Customer (Auto-checks Intra-State vs Inter-State supply)
   - Add Line Items (Dynamic price, quantity, discount)
   - Real-time preview of Taxable, CGST/SGST or IGST, and Grand Total
   - Click "Generate & Save Invoice"
   - Official Tax Invoice PDF (`INV/2026-27/0001.pdf`) is created with QR code
      ↓
6. Record Payment against Invoice:
   - User clicks "Pay" on an UNPAID or PARTIALLY PAID invoice
   - Enter Payment Amount, select Method (UPI / Bank Transfer / Cash), enter UTR Reference
   - Click "Save Payment & Generate Receipt"
      ↓
7. Official Payment Receipt Generated:
   - Status updates automatically to PAID or PARTIALLY PAID
   - Unique Receipt Number allocated (`REC/2026-27/0001`)
   - Official Receipt PDF is generated and downloaded with payment progression summary and QR verification
      ↓
8. Reports & Audits:
   - View GSTR-1 Tax statement with tax breakdown
   - Export CSV ledgers or print summaries
```

---

## 📦 Building the Production ZIP Package

To create the clean distribution package `gst-invoice-receipt-manager.zip` (excluding `node_modules`, temporary files, and `.git`):

```bash
npm run package
```

---

## 🛡️ License

This project is licensed under the MIT License.
