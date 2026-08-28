/**
 * Indian rupee formatting: ₹1,23,456 style (lakh/crore grouping),
 * whole rupees only — no paise, per the assignment spec.
 *
 * We can't just use Intl.NumberFormat('en-IN', { style: 'currency' })
 * blindly because some environments render it as "₹ 1,23,456.00"
 * with a space and decimals. Locking maximumFractionDigits to 0 and
 * building the ₹ prefix ourselves keeps the output predictable.
 */
export function formatINR(amount) {
  const rounded = Math.round(Number(amount) || 0);
  const grouped = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(rounded);
  return `₹${grouped}`;
}
