const crypto = require('crypto');

const SECRET = process.env.TOKEN_SECRET;
const ACCESS_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24;
const REFRESH_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 30;

if (!SECRET || SECRET.length < 32) {
  throw new Error('TOKEN_SECRET must be at least 32 characters in .env');
}

/**
 * Encode object to base64url string
 */
const b64urlEncode = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');

/**
 * Decode base64url string to object
 */
const b64urlDecode = (str) =>
  JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));

/**
 * Sign a payload string with HMAC-SHA256
 */
const sign = (payload) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

/**
 * Create a token: header.payload.signature
 * Similar in structure to JWT but fully custom
 */
const createToken = (data, type = 'access') => {
  const expiresAt =
    type === 'refresh'
      ? Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      : Date.now() + ACCESS_EXPIRY_HOURS * 60 * 60 * 1000;

  const header = b64urlEncode({ alg: 'HS256', typ: 'UTK', tokenType: type });
  const payload = b64urlEncode({ ...data, expiresAt, iat: Date.now() });
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
};

/**
 * Verify and decode a token
 * Returns decoded payload or throws an error
 */
const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token missing or malformed');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [header, payload, signature] = parts;

  const expectedSig = sign(`${header}.${payload}`);
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  const receivedBuf = Buffer.from(signature, 'base64url');

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    throw new Error('Invalid token signature');
  }

  const decodedPayload = b64urlDecode(payload);
  const decodedHeader = b64urlDecode(header);

  const decoded = {
    ...decodedPayload,
    tokenType: decodedHeader.tokenType,
  };

  if (Date.now() > decoded.expiresAt) {
    throw new Error('Token expired');
  }

  return decoded;
};

/**
 * Generate both access + refresh tokens
 */
const generateTokenPair = (userData) => {
  const payload = {
    userId: userData._id.toString(),
    email: userData.email,
    role: userData.role,
  };

  return {
    accessToken: createToken(payload, 'access'),
    refreshToken: createToken(payload, 'refresh'),
    expiresIn: ACCESS_EXPIRY_HOURS * 3600,
  };
};

/**
 * Generate a secure random token (for email verification, password reset etc.)
 */
const generateSecureCode = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

/**
 * Hash a code for storage (one-way, not for passwords — use bcrypt for passwords)
 */
const hashCode = (code) =>
  crypto.createHmac('sha256', SECRET).update(code).digest('hex');

module.exports = {
  createToken,
  verifyToken,
  generateTokenPair,
  generateSecureCode,
  hashCode,
};
