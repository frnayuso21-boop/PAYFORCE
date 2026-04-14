// Tipos para los endpoints de la API de PayForce relacionados con Stripe

export interface CreateAccountRequest {
  email:        string;
  country:      string;
  businessType: "individual" | "company";
}

export interface CreateAccountResponse {
  accountId:    string;
  onboardingUrl?: string;
}

export interface ApiError {
  error: string;
  code?:  string;
}

export interface CreateAccountLinkRequest {
  accountId:  string;
  returnUrl?: string;
  refreshUrl?: string;
}

export interface CreateAccountLinkResponse {
  url:       string;
  expiresAt: number;
}
