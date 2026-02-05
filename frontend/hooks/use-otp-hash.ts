import { useCallback } from 'react';

/**
 * Compute SHA-256 hash of a string and return a lowercase hex digest.
 *
 * This implementation is pure TypeScript/JavaScript (no external packages) and is intended
 * to work inside React Native/Expo environments where Node's `crypto` module may not exist.
 *
 * Note: This is for OTP verification, not password storage.
 */
function sha256Hex(message: string): string {
  // Based on a minimal SHA-256 implementation using 32-bit operations.
  // eslint-disable-next-line no-bitwise
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

  const utf8 = unescape(encodeURIComponent(message));
  const words: number[] = [];
  const messageLength = utf8.length;

  for (let i = 0; i < messageLength; i++) {
    // eslint-disable-next-line no-bitwise
    words[i >> 2] |= utf8.charCodeAt(i) << (24 - (i % 4) * 8);
  }

  // Append padding
  // eslint-disable-next-line no-bitwise
  words[messageLength >> 2] |= 0x80 << (24 - (messageLength % 4) * 8);
  words[((messageLength + 64 >> 9) << 4) + 15] = messageLength * 8;

  const w = new Array<number>(64);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      // eslint-disable-next-line no-bitwise
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Custom hook providing OTP hashing helpers.
 */
export function useOtpHash() {
  /**
   * Hash a user-entered 6-digit OTP with SHA-256.
   *
   * Parameters:
   *  - otp: The OTP string (usually 6 digits).
   *
   * Returns:
   *  - A lowercase SHA-256 hex digest.
   */
  const hashOtp = useCallback((otp: string): string => {
    return sha256Hex(otp.trim());
  }, []);

  /**
   * Compare an OTP to a stored hash.
   *
   * Returns:
   *  - `true` if the hashed OTP equals `expectedHash`, else `false`.
   */
  const matchesHash = useCallback((otp: string, expectedHash: string): boolean => {
    return hashOtp(otp) === expectedHash;
  }, [hashOtp]);

  return { hashOtp, matchesHash };
}

