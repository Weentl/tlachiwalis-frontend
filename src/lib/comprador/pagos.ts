// Tarjeta guardada (proyección segura desde Stripe vía apps/api). Nunca el PAN.
export type MetodoPago = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};
