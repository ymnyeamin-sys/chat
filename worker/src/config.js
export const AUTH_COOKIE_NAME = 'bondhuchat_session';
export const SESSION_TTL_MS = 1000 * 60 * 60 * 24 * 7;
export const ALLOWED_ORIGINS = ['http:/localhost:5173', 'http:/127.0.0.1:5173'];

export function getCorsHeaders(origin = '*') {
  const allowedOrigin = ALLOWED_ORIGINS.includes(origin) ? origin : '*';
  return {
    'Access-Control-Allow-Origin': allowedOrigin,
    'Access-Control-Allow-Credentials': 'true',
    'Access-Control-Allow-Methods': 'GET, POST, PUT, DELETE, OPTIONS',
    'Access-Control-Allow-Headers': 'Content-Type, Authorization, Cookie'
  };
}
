const encoder = new TextEncoder();

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: 120000
    },
    keyMaterial,
    256
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return `pbkdf2_sha256$120000$${toBase64(salt)}$${toBase64(derivedBytes)}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('pbkdf2_sha256$')) return false;

  const [, iterations, saltB64, hashB64] = storedHash.split('$');
  const salt = Uint8Array.from(atob(saltB64), (char) => char.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(hashB64), (char) => char.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: Number(iterations)
    },
    keyMaterial,
    expectedHash.length * 8
  );

  const actualHash = new Uint8Array(derivedBits);
  return crypto.subtle.timingSafeEqual(actualHash, expectedHash);
}
