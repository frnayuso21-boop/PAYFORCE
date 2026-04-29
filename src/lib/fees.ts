export const PLATFORM_FEES = {
  card_eu:     { percentage: 0.04,  fixed: 40 }, // 4%   + 0,40€
  card_non_eu: { percentage: 0.05,  fixed: 40 }, // 5%   + 0,40€
  bizum:       { percentage: 0.03,  fixed: 30 }, // 3%   + 0,30€
  apple_pay:   { percentage: 0.04,  fixed: 40 }, // 4%   + 0,40€
  google_pay:  { percentage: 0.04,  fixed: 40 }, // 4%   + 0,40€
  klarna:      { percentage: 0.05,  fixed: 40 }, // 5%   + 0,40€
  sepa_debit:  { percentage: 0.025, fixed: 25 }, // 2,5% + 0,25€
  default:     { percentage: 0.04,  fixed: 40 }, // 4%   + 0,40€ (fallback)
};

const EU_COUNTRIES = new Set([
  "ES","FR","DE","IT","PT","NL","BE","AT","PL",
  "SE","DK","FI","IE","GR","CZ","HU","RO","BG",
  "HR","SK","SI","EE","LV","LT","LU","MT","CY",
]);

export function calculateFee(
  amount: number,
  paymentMethodType?: string | null,
  cardCountry?: string | null,
): number {
  let feeConfig = PLATFORM_FEES.default;

  if (paymentMethodType === "bizum") {
    feeConfig = PLATFORM_FEES.bizum;
  } else if (paymentMethodType === "klarna") {
    feeConfig = PLATFORM_FEES.klarna;
  } else if (paymentMethodType === "apple_pay") {
    feeConfig = PLATFORM_FEES.apple_pay;
  } else if (paymentMethodType === "google_pay") {
    feeConfig = PLATFORM_FEES.google_pay;
  } else if (paymentMethodType === "sepa_debit") {
    feeConfig = PLATFORM_FEES.sepa_debit;
  } else if (paymentMethodType === "card") {
    if (cardCountry && EU_COUNTRIES.has(cardCountry)) {
      feeConfig = PLATFORM_FEES.card_eu;
    } else if (cardCountry) {
      feeConfig = PLATFORM_FEES.card_non_eu;
    }
    // No country → default (4% + 0,40€)
  }

  return Math.round(amount * feeConfig.percentage) + feeConfig.fixed;
}

/** Etiqueta legible para el método de pago */
export function paymentMethodLabel(type?: string | null): string {
  switch (type) {
    case "card":       return "Tarjeta";
    case "bizum":      return "Bizum";
    case "apple_pay":  return "Apple Pay";
    case "google_pay": return "Google Pay";
    case "klarna":     return "Klarna";
    case "sepa_debit": return "SEPA Débito";
    default:           return "Otro";
  }
}
