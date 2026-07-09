const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

// Money is stored/transported as integer cents everywhere in the API; this
// is the single place that divides by 100 and applies currency formatting,
// so no call site hand-rolls `$${x / 100}`.
export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
