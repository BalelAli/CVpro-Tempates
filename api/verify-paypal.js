import crypto from "node:crypto";

// Keep these prices aligned with the premium cards in index.html.
const PRICES = Object.freeze({
  "Executive Purple": "4.99",
  "Professional Pro": "6.99",
  "Creative Green": "5.99",
  "Portfolio Modern": "6.99",
});

function cors(req, res) {
  const allowedOrigin = process.env.SITE_ORIGIN || "https://balelali.github.io";
  const requestOrigin = req.headers.origin;
  if (!requestOrigin || requestOrigin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }
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
  cors(req, res);
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

    if (capture.id !== transactionId || capture.status !== "COMPLETED" || currency !== "USD" || paidAmount !== expected) {
      return res.status(400).json({
        error: "Payment is not valid for this template.",
        status: capture.status,
        amount: paidAmount,
        currency,
      });
    }

    if (!process.env.DOWNLOAD_SECRET || process.env.DOWNLOAD_SECRET.length < 32) {
      return res.status(503).json({ error: "Secure downloads are not configured yet." });
    }

    const downloadToken = signDownload(template, transactionId);
    const apiBaseUrl = (process.env.API_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")).replace(/\\/$/, "");
    if (!apiBaseUrl.startsWith("https://")) {
      return res.status(503).json({ error: "Secure download API URL is not configured yet." });
    }
    return res.status(200).json({
      verified: true,
      template,
      downloadUrl: `${apiBaseUrl}/api/premium-download?template=${encodeURIComponent(template)}&token=${downloadToken}`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Verification service error." });
  }
}
