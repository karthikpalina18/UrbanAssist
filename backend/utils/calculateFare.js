/**
 * Calculate fare based on base price and distance
 * @param {number} basePrice - Base price of the service
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} - Pricing breakdown
 */
const calculateFare = (basePrice, distanceKm = 0) => {
  const RATE_PER_KM = 10; // ₹10 per km
  const TAX_RATE = 0.18; // 18% GST
  const PLATFORM_FEE = 20; // ₹20 platform fee

  const distanceCharge = Math.round(distanceKm * RATE_PER_KM);
  const subtotal = basePrice + distanceCharge + PLATFORM_FEE;
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const totalAmount = subtotal + taxAmount;

  return {
    basePrice,
    distanceCharge,
    platformFee: PLATFORM_FEE,
    subtotal,
    taxAmount,
    taxRate: TAX_RATE * 100,
    discount: 0,
    totalAmount
  };
};

/**
 * Apply discount to pricing
 * @param {object} pricing - Pricing object
 * @param {number} discountPercent - Discount percentage
 * @returns {object} - Updated pricing
 */
const applyDiscount = (pricing, discountPercent) => {
  const discountAmount = Math.round(pricing.subtotal * (discountPercent / 100));
  const newSubtotal = pricing.subtotal - discountAmount;
  const newTaxAmount = Math.round(newSubtotal * (pricing.taxRate / 100));
  
  return {
    ...pricing,
    discount: discountAmount,
    discountPercent,
    subtotal: newSubtotal,
    taxAmount: newTaxAmount,
    totalAmount: newSubtotal + newTaxAmount
  };
};

module.exports = { calculateFare, applyDiscount };