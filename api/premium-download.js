import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const FILES = Object.freeze({
  "Executive Purple": "executive-purple.rtf",
  "Professional Pro": "professional-pro.rtf",
  "Creative Green": "creative-green.rtf",
  "Portfolio Modern": "portfolio-modern.rtf",
});

function verifyToken(token, template) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [name, captureId, expires, signature] = raw.split("|");
    if (name !== template || !captureId || Date.now() > Number(expires)) return false;
    const payload = `${name}|${captureId}|${expires}`;
    const expected = crypto.createHmac("sha256", process.env.DOWNLOAD_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("GET only.");
  if (!process.env.DOWNLOAD_SECRET || process.env.DOWNLOAD_SECRET.length < 32) {
    return res.status(503).send("Secure downloads are not configured yet.");
  }

  const { template, token } = req.query || {};
  const filename = FILES[template];

  if (!filename || !token || !verifyToken(token, template)) {
    return res.status(403).send("Download link is invalid or expired.");
  }

  const filePath = path.join(process.cwd(), "templates", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Premium template is unavailable.");
  }

  const isRtf = filename.endsWith(".rtf");
  res.setHeader("Content-Type", isRtf ? "application/rtf; charset=utf-8" : "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
  return res.status(200).send(fs.readFileSync(filePath, "utf8"));
}
