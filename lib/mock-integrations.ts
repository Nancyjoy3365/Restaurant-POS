import QRCode from "qrcode";

// Simulated integrations only — no real M-Pesa or KRA eTIMS calls are made.
// In production these would call Safaricom Daraja (M-Pesa) and the KRA eTIMS
// OSCU/VSCU device API over TLS, with payment data tokenized and the
// datastore encrypted at rest.

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
