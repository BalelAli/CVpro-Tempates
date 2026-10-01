import crypto from "node:crypto";

const PRICES = {
  "Executive Purple": "4.99",
  "Professional Pro": "6.99",
  "Creative Green": "5.99",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function getPayPalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new Error("PayPal authentication failed");
  const data = await response.json();
  return data.access_token;
}

function signDownload(template, captureId) {
  const expires = Date.now() + 15 * 60 * 1000;
  const payload = `${template}|${captureId}|${expires}`;
  const signature = crypto
    .createHmac("sha256", process.env.DOWNLOAD_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { transactionId, template } = req.body || {};
    const expected = PRICES[template];

    if (!transactionId || !expected) {
      return res.status(400).json({ error: "Transaction ID and valid template are required." });
    }

    const token = await getPayPalAccessToken();
    const response = await fetch(
      `https://api-m.paypal.com/v2/payments/captures/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      return res.status(400).json({ error: "PayPal could not verify this transaction." });
    }

    const capture = await response.json();
    const paidAmount = capture?.amount?.value;
    const currency = capture?.amount?.currency_code;

    if (capture.status !== "COMPLETED" || currency !== "USD" || paidAmount !== expected) {
      return res.status(400).json({
        error: "Payment is not valid for this template.",
        status: capture.status,
        amount: paidAmount,
        currency,
      });
    }

    const downloadToken = signDownload(template, transactionId);
    return res.status(200).json({
      verified: true,
      template,
      downloadUrl: `/api/premium-download?template=${encodeURIComponent(template)}&token=${downloadToken}`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Verification service error." });
  }
}
