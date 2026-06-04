import type { VatBreakdown } from "../api/orders/route";

export interface CartItemForVat {
  price: number;
  qty: number;
  vatRate: 7 | 19;
}

/** Berechnet MwSt-Aufschlüsselung für 7% und 19% */
export function calcVat(
  items: CartItemForVat[],
  deliveryFee: number
): { vat7: VatBreakdown; vat19: VatBreakdown } {
  let gross7 = 0;
  let gross19 = 0;

  for (const ci of items) {
    const lineTotal = ci.price * ci.qty;
    if (ci.vatRate === 19) gross19 += lineTotal;
    else gross7 += lineTotal;
  }

  // Liefergebühr gilt als Dienstleistung → 19 %
  gross19 += deliveryFee;

  const net7 = gross7 / 1.07;
  const vat7amount = gross7 - net7;

  const net19 = gross19 / 1.19;
  const vat19amount = gross19 - net19;

  return {
    vat7: { gross: gross7, net: round(net7), vat: round(vat7amount) },
    vat19: { gross: gross19, net: round(net19), vat: round(vat19amount) },
  };
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

export function formatEur(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}
