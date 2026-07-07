import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = process.env.ENCRYPTION_SECRET!; // 32-char hex string

/**
 * Encrypts a plain text string (e.g., App Password).
 * Returns a colon-separated string: iv:authTag:encryptedData
 */
export const encrypt = (text: string): string => {
  const key = Buffer.from(SECRET_KEY, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

/**
 * Decrypts a string that was encrypted with the `encrypt` function.
 */
export const decrypt = (encryptedText: string): string => {
  const key = Buffer.from(SECRET_KEY, "hex");
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
