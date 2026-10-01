import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const FILES = {
  "Executive Purple": "executive-purple.html",
  "Professional Pro": "professional-pro.html",
  "Creative Green": "creative-green.html",
};

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
  const { template, token } = req.query || {};
  const filename = FILES[template];

  if (!filename || !token || !verifyToken(token, template)) {
    return res.status(403).send("Download link is invalid or expired.");
  }

  const filePath = path.join(process.cwd(), "templates", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Premium template is unavailable.");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(fs.readFileSync(filePath, "utf8"));
}
