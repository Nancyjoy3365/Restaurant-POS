import QRCode from "qrcode";

// Simulated integrations only — no real M-Pesa, card, or KRA eTIMS calls are made.
// In production these would call Safaricom Daraja (M-Pesa), a card PSP, and the
// KRA eTIMS OSCU/VSCU device API over TLS, with payment data tokenized and the
// datastore encrypted at rest.

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export async function simulateCardPayment(): Promise<{ ref: string }> {
  await new Promise((r) => setTimeout(r, 1200));
  return { ref: `CARD-AUTH-${randomDigits(6)}` };
}

export function simulateCashPayment(tendered: number, total: number): { ref: string; change: number } {
  return { ref: "CASH", change: Math.max(0, tendered - total) };
}

export async function simulateEtimsSigning(payload: {
  invoiceNumber: string;
  invoiceRef: string;
  total: number;
}): Promise<{ qrDataUrl: string }> {
  await new Promise((r) => setTimeout(r, 900));
  const verificationString = `https://etims.kra.go.ke/verify?inv=${payload.invoiceNumber}&ref=${payload.invoiceRef}&amt=${payload.total}`;
  const qrDataUrl = await QRCode.toDataURL(verificationString, {
    width: 160,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  return { qrDataUrl };
}
