import CryptoJS from "crypto-js";

// Generate a secure encryption key (in production, load from an environment variable)
const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse("1234567890123456"); // 16 bytes key (128 bits)

// Encrypt text with AES
export const encryptText = (text: string): string => {
  const iv = CryptoJS.lib.WordArray.random(16); // Generate a random IV (16 bytes)
  const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Combine IV and encrypted text as Base64 for transmission
  return `${iv.toString(CryptoJS.enc.Base64)}:${encrypted.toString()}`;
};

// Decrypt text with AES
export const decryptText = (encryptedText: string): string => {
  try {
    const [ivBase64, ciphertext] = encryptedText.split(":"); // Extract IV and ciphertext
    if (!ivBase64 || !ciphertext) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = CryptoJS.enc.Base64.parse(ivBase64); // Decode IV from Base64
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8); // Convert to UTF-8 string
    if (!plaintext) {
      throw new Error("Decryption failed");
    }

    return plaintext;
  } catch (error) {
    console.error("Decryption failed:", error, "Encrypted Text:", encryptedText);
    throw error;
  }
};
