/**
 * EAN-13 Barcode Generator Utility
 *
 * EAN-13 Structure (13 digits total):
 * - Digits 1-3: Country code (e.g., 590 for Poland, 400-440 for Germany)
 * - Digits 4-8: Manufacturer code (5 digits, assigned by GS1 or custom)
 * - Digits 9-12: Product code (4 digits, assigned by manufacturer)
 * - Digit 13: Check digit (calculated using modulo 10 algorithm)
 *
 * Example: 5901234567890
 *          ^^^ ^^^^^ ^^^^ ^
 *          |   |     |    └─ Check digit
 *          |   |     └────── Product code
 *          |   └──────────── Manufacturer code
 *          └──────────────── Country code
 */

/**
 * Calculate the EAN-13 check digit using the modulo 10 algorithm
 * @param {string} ean12 - First 12 digits of the EAN (without check digit)
 * @returns {string} The check digit (0-9)
 */
export const calculateCheckDigit = (ean12) => {
  if (ean12.length !== 12) {
    throw new Error('EAN must be exactly 12 digits before calculating check digit');
  }

  let sum = 0;

  // Process each digit
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(ean12[i]);

    // Odd positions (1st, 3rd, 5th...) from the right are multiplied by 3
    // Even positions (2nd, 4th, 6th...) from the right are multiplied by 1
    // Note: Array index 0 is position 1 from left, which is position 12 from right (even)
    if (i % 2 === 0) {
      sum += digit * 1; // Positions 1,3,5,7,9,11 from left = even positions from right
    } else {
      sum += digit * 3; // Positions 2,4,6,8,10,12 from left = odd positions from right
    }
  }

  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit.toString();
};

/**
 * Validate an existing EAN-13 code
 * @param {string} ean13 - Complete 13-digit EAN code
 * @returns {boolean} True if valid, false otherwise
 */
export const validateEAN13 = (ean13) => {
  if (!ean13 || ean13.length !== 13 || !/^\d{13}$/.test(ean13)) {
    return false;
  }

  const ean12 = ean13.substring(0, 12);
  const providedCheckDigit = ean13[12];
  const calculatedCheckDigit = calculateCheckDigit(ean12);

  return providedCheckDigit === calculatedCheckDigit;
};

/**
 * Generate a complete EAN-13 barcode
 * @param {string} countryCode - 3-digit country code (e.g., "590" for Poland)
 * @param {string} manufacturerCode - 5-digit manufacturer code
 * @param {string} productCode - 4-digit product code
 * @returns {string} Complete 13-digit EAN-13 code with check digit
 */
export const generateEAN13 = (countryCode, manufacturerCode, productCode) => {
  // Validate inputs
  if (!countryCode || countryCode.length !== 3 || !/^\d{3}$/.test(countryCode)) {
    throw new Error('Country code must be exactly 3 digits');
  }

  if (!manufacturerCode || manufacturerCode.length !== 5 || !/^\d{5}$/.test(manufacturerCode)) {
    throw new Error('Manufacturer code must be exactly 5 digits');
  }

  if (!productCode || productCode.length !== 4 || !/^\d{4}$/.test(productCode)) {
    throw new Error('Product code must be exactly 4 digits');
  }

  // Combine first 12 digits
  const ean12 = countryCode + manufacturerCode + productCode;

  // Calculate and append check digit
  const checkDigit = calculateCheckDigit(ean12);
  const ean13 = ean12 + checkDigit;

  return ean13;
};

/**
 * Format EAN-13 for display (with spaces or hyphens)
 * @param {string} ean13 - 13-digit EAN code
 * @param {string} separator - Separator character (default: space)
 * @returns {string} Formatted EAN (e.g., "590 12345 6789 0")
 */
export const formatEAN13 = (ean13, separator = ' ') => {
  if (!ean13 || ean13.length !== 13) {
    return ean13;
  }

  return `${ean13.substring(0, 3)}${separator}${ean13.substring(3, 8)}${separator}${ean13.substring(8, 12)}${separator}${ean13[12]}`;
};

/**
 * Parse formatted EAN back to plain 13 digits
 * @param {string} formattedEAN - EAN with separators
 * @returns {string} Plain 13-digit EAN
 */
export const parseEAN13 = (formattedEAN) => {
  return formattedEAN.replace(/\D/g, '');
};

/**
 * Generate a random manufacturer code (for testing/demo purposes)
 * @returns {string} 5-digit manufacturer code
 */
export const generateRandomManufacturerCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

/**
 * Generate a random product code (for testing/demo purposes)
 * @returns {string} 4-digit product code
 */
export const generateRandomProductCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Auto-generate a complete EAN-13 with random codes
 * @param {string} countryCode - 3-digit country code
 * @returns {string} Complete EAN-13 code
 */
export const autoGenerateEAN13 = (countryCode) => {
  const manufacturerCode = generateRandomManufacturerCode();
  const productCode = generateRandomProductCode();
  return generateEAN13(countryCode, manufacturerCode, productCode);
};
