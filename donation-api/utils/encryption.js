// ============================================
// FILE 9: utils/encryption.js
// ============================================
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

export const encryptData = (data) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

export const decryptData = (data) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};