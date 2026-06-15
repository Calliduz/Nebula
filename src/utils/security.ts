// Converts a UTF-8 string to a Uint8Array
function stringToUtf8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Converts a Uint8Array to a hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Bitwise right rotation for 32-bit integers
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

// Standard SHA-256 implementation working on Uint8Array
function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const l = bytes.length;
  const bitLen = l * 8;
  const paddingLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
  const padded = new Uint8Array(l + paddingLen + 8);
  padded.set(bytes);
  padded[l] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);
  if (bitLen > 0xffffffff) {
    view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);
  }

  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let h_val = h[7];

    for (let t = 0; t < 64; t++) {
      if (t < 16) {
        w[t] = view.getUint32(i + t * 4, false);
      } else {
        const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h_val + S1 + ch + k[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h_val = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + h_val) | 0;
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  for (let j = 0; j < 8; j++) {
    resultView.setUint32(j * 4, h[j], false);
  }
  return result;
}

// Computes HMAC-SHA256 synchronously
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let processedKey = key;
  if (key.length > 64) {
    processedKey = sha256Bytes(key);
  }

  const paddedKey = new Uint8Array(64);
  paddedKey.set(processedKey);

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const innerMsg = new Uint8Array(64 + message.length);
  innerMsg.set(ipad);
  innerMsg.set(message, 64);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(64 + 32);
  outerMsg.set(opad);
  outerMsg.set(innerHash, 64);
  return sha256Bytes(outerMsg);
}

// Main high-level generator
export function generateSignatureSync(
  method: string,
  path: string,
  timestamp: number,
  client: string = "web-client"
): string {
  const secret = import.meta.env.VITE_SIGNING_SECRET;
  if (!secret) {
    throw new Error("VITE_SIGNING_SECRET environment variable is missing");
  }

  const message = `${method}:${path}:${timestamp}:${client}`;
  const keyBytes = stringToUtf8Array(secret);
  const msgBytes = stringToUtf8Array(message);

  const hmacBytes = hmacSha256(keyBytes, msgBytes);
  return bytesToHex(hmacBytes);
}

// Generates the security headers for a request
export function getSecurityHeaders(method: string, path: string): Record<string, string> {
  try {
    const ts = Date.now();
    const sig = generateSignatureSync(method, path, ts, "web-client");
    return {
      "x-nebula-timestamp": String(ts),
      "x-nebula-signature": sig,
      "x-nebula-client": "web-client",
    };
  } catch (err) {
    console.error("[SECURITY] Failed to generate security headers:", err);
    return {};
  }
}
