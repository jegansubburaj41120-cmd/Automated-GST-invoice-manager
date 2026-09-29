-- Complete Database Schema for GST Invoice & Receipt Manager

CREATE DATABASE IF NOT EXISTS gst_invoice_manager;
USE gst_invoice_manager;

-- Drop tables in reverse order of foreign keys if re-running
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS gst_rates;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users Table (Admin & Staff)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  phone VARCHAR(20),
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers Table
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(25) NOT NULL,
  gstin VARCHAR(15),
  pan VARCHAR(10),
  customer_type ENUM('registered', 'unregistered') NOT NULL DEFAULT 'unregistered',
  billing_address TEXT NOT NULL,
  shipping_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  pincode VARCHAR(10),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_name (name),
  INDEX idx_customer_gstin (gstin),
  INDEX idx_customer_phone (phone),
  INDEX idx_customer_state_code (state_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GST Rates Master Table
CREATE TABLE gst_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rate_percentage DECIMAL(5,2) NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  description VARCHAR(150),
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  hsn_code VARCHAR(20) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  unit VARCHAR(20) NOT NULL DEFAULT 'NOS',
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  description TEXT,
  image_url VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_product_name (name),
  INDEX idx_product_hsn (hsn_code),
  INDEX idx_product_sku (sku),
  INDEX idx_product_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company Settings Table
CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(200) NOT NULL DEFAULT 'Acme GST Solutions Pvt Ltd',
  company_logo VARCHAR(255) DEFAULT '',
  business_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
  state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
  state_code VARCHAR(2) NOT NULL DEFAULT '27',
  pincode VARCHAR(10) NOT NULL DEFAULT '400001',
  phone VARCHAR(30) NOT NULL DEFAULT '+91 9876543210',
  email VARCHAR(150) NOT NULL DEFAULT 'billing@acmegst.com',
  website VARCHAR(150) DEFAULT 'https://www.acmegst.com',
  gstin VARCHAR(15) NOT NULL DEFAULT '27ABCDE1234F1Z5',
  pan VARCHAR(10) NOT NULL DEFAULT 'ABCDE1234F',
  bank_name VARCHAR(150) NOT NULL DEFAULT 'State Bank of India',
  account_number VARCHAR(50) NOT NULL DEFAULT '123456789012',
  ifsc VARCHAR(20) NOT NULL DEFAULT 'SBIN0001234',
  upi_id VARCHAR(100) DEFAULT 'acmegst@sbi',
  invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
  receipt_prefix VARCHAR(20) NOT NULL DEFAULT 'REC',
  terms_conditions TEXT,
  authorized_signatory VARCHAR(100) NOT NULL DEFAULT 'Director / Authorized Signatory',
  designation VARCHAR(100) DEFAULT 'Managing Director',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices Table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  place_of_supply VARCHAR(100) NOT NULL,
  place_of_supply_code VARCHAR(2) NOT NULL,
  is_inter_state TINYINT(1) NOT NULL DEFAULT 0,
  payment_terms VARCHAR(100) DEFAULT 'Due on Receipt',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  round_off DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('UNPAID', 'PARTIALLY PAID', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  pdf_path VARCHAR(255),
  qr_path VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_invoice_customer (customer_id),
  INDEX idx_invoice_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items Table
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(200) NOT NULL,
  hsn_code VARCHAR(20) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(20) NOT NULL DEFAULT 'NOS',
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  taxable_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_item_invoice (invoice_id),
  INDEX idx_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments Table
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other') NOT NULL DEFAULT 'UPI',
  transaction_reference VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payment_invoice (invoice_id),
  INDEX idx_payment_customer (customer_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Receipts Table
CREATE TABLE receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  payment_id INT NOT NULL,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  receipt_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  pdf_path VARCHAR(255),
  qr_path VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_receipt_date (receipt_date),
  INDEX idx_receipt_payment (payment_id),
  INDEX idx_receipt_invoice (invoice_id),
  INDEX idx_receipt_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(100) DEFAULT 'System',
  user_role VARCHAR(50) DEFAULT 'system',
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  record_id VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_module (module),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
