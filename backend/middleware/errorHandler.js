function errorHandler(err, req, res, next) {
  console.error('Server error intercepted:', err);

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Friendly messages without raw database dumps
  let message = err.message || 'An unexpected internal server error occurred.';

  if (err.code === 'ER_DUP_ENTRY') {
    message = 'A record with duplicate details (such as email, SKU, or reference number) already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    message = 'Cannot complete operation due to linked existing records (foreign key constraint).';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
