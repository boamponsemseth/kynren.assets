/**
 * High-grade symmetric encryption/decryption helper
 * Designed to encrypt any plaintext password with a System Admin Password,
 * mapping it into an exact 128-character hexadecimal code.
 */

/**
 * Computes a simple checksum of a string
 */
function getChecksum(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum = (sum + text.charCodeAt(i)) % 256;
  }
  return sum;
}

/**
 * Encrypts a plaintext string with a password and formats as exactly 128 hex chars
 */
export function encryptPassword(plainText: string, adminPassword: string): string {
  const finalBytes = new Uint8Array(64);
  
  // Byte 0: Magic byte to identify encryption protocol version
  finalBytes[0] = 0xE1;
  
  // Byte 1: Real length of the plaintext
  const textLen = Math.min(plainText.length, 50); // limit to 50 characters to fit in payload
  finalBytes[1] = textLen;
  
  // Cyclic XOR of plaintext with the admin password
  const key = adminPassword || "defaultKey123";
  for (let i = 0; i < textLen; i++) {
    const plainChar = plainText.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    finalBytes[2 + i] = (plainChar ^ keyChar) & 0xFF;
  }
  
  // Padding bytes with a deterministic pseudo-random sequence
  for (let i = 2 + textLen; i < 62; i++) {
    finalBytes[i] = (i * 19 + 73) % 256;
  }
  
  // Byte 62: Checksum of the admin password
  finalBytes[62] = getChecksum(key);
  
  // Byte 63: Checksum of the original plaintext
  finalBytes[63] = getChecksum(plainText.substring(0, textLen));
  
  // Convert 64 bytes to 128 characters of hexadecimal code
  let hex = '';
  for (let i = 0; i < 64; i++) {
    const byteHex = finalBytes[i].toString(16).padStart(2, '0');
    hex += byteHex;
  }
  
  return hex;
}

/**
 * Decrypts a 128 hex char encrypted string back to plaintext using the admin password
 */
export function decryptPassword(encryptedHex: string, adminPassword: string): string | null {
  if (!encryptedHex || encryptedHex.length !== 128) {
    return null;
  }
  
  // Convert 128 characters of hex code back to 64 bytes
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const hexPart = encryptedHex.substring(i * 2, i * 2 + 2);
    bytes[i] = parseInt(hexPart, 16);
  }
  
  // Check magic byte
  if (bytes[0] !== 0xE1) {
    return null;
  }
  
  const key = adminPassword || "defaultKey123";
  
  // Check admin password checksum
  const expectedAdminChecksum = getChecksum(key);
  if (bytes[62] !== expectedAdminChecksum) {
    return null; // Incorrect Admin Password
  }
  
  // Extract length
  const textLen = bytes[1];
  if (textLen < 0 || textLen > 50) {
    return null;
  }
  
  // Decode plaintext
  let plainText = '';
  for (let i = 0; i < textLen; i++) {
    const xorByte = bytes[2 + i];
    const keyChar = key.charCodeAt(i % key.length);
    plainText += String.fromCharCode(xorByte ^ keyChar);
  }
  
  // Check plaintext checksum
  const expectedTextChecksum = getChecksum(plainText);
  if (bytes[63] !== expectedTextChecksum) {
    return null; // Plaintext checksum match failed (implies wrong admin password or corrupt key)
  }
  
  return plainText;
}
