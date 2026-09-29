/**
 * Utility to convert numbers into Indian Currency format words (Rupees and Paise)
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(num) {
  if (num < 20) return ones[num];
  const unit = num % 10;
  return tens[Math.floor(num / 10)] + (unit ? ' ' + ones[unit] : '');
}

function convertThreeDigits(num) {
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  let str = '';
  if (hundred > 0) {
    str += ones[hundred] + ' Hundred';
    if (rest > 0) str += ' and ';
  }
  if (rest > 0) {
    str += convertTwoDigits(rest);
  }
  return str;
}

function numberToWords(amount) {
  if (amount === 0 || isNaN(amount)) return 'Rupees Zero Only';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = '';

  if (integerPart === 0) {
    words = 'Zero';
  } else {
    // Indian Numbering: Crores, Lakhs, Thousands, Hundreds
    const crore = Math.floor(integerPart / 10000000);
    let remainder = integerPart % 10000000;

    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;

    const thousand = Math.floor(remainder / 1000);
    const hundredGroup = remainder % 1000;

    const parts = [];

    if (crore > 0) {
      parts.push(convertThreeDigits(crore) + ' Crore');
    }
    if (lakh > 0) {
      parts.push(convertTwoDigits(lakh) + ' Lakh');
    }
    if (thousand > 0) {
      parts.push(convertTwoDigits(thousand) + ' Thousand');
    }
    if (hundredGroup > 0) {
      parts.push(convertThreeDigits(hundredGroup));
    }

    words = parts.join(' ');
  }

  let result = 'Rupees ' + words;

  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

module.exports = {
  numberToWords
};
