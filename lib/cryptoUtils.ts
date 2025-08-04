import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_ENCRYPTION_KEY || '2h234gy2ct9b6t3b7683b%#*&@#&tB232B834'
const IV = process.env.NEXT_PUBLIC_IV_KEY || 'linkychainivkey!';

const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

export const encrypt = (text: string): string => {
  if (!text) return '';
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
};

export const decrypt = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
};