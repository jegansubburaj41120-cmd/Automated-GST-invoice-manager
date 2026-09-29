/**
 * Indian Financial Year Helper
 * FY runs from April 1 to March 31
 * Example: Date 2026-09-15 -> FY '2026-27'
 * Date 2027-02-10 -> FY '2026-27'
 */

function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
  const year = d.getFullYear();

  let startYear, endYear;
  if (month >= 3) {
    // Apr to Dec
    startYear = year;
    endYear = (year + 1) % 100;
  } else {
    // Jan to Mar
    startYear = year - 1;
    endYear = year % 100;
  }

  const endStr = endYear < 10 ? `0${endYear}` : `${endYear}`;
  return `${startYear}-${endStr}`;
}

/**
 * Formats standard document numbers
 * e.g. prefix = 'INV', fy = '2026-27', seq = 1 -> 'INV/2026-27/0001'
 */
function formatDocumentNumber(prefix, sequenceNum, date = new Date()) {
  const fy = getFinancialYear(date);
  const padded = String(sequenceNum).padStart(4, '0');
  return `${prefix}/${fy}/${padded}`;
}

module.exports = {
  getFinancialYear,
  formatDocumentNumber
};
