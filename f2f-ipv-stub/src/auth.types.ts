export interface EvidenceRequested {
  strengthScore?: number;
  validityScore?: number;
  verificationScore?: number;
  activityHistoryScore?: number;
  identityFraudScore?: number;
}

export interface JWTPayload {
  // Required as per OpenID Connect documentation
  iss: string;
  sub: string;
  aud: string;
  jti: string;
  exp: number;
  // Additional optional values
  redirect_uri?: string;
  client_id?: string;
  response_type?: string;
  state?: string;
  nbf?: number;
  iat?: number;
  scope?: string;
  nonce?: string;
  evidence_requested?: EvidenceRequested | undefined;
  [key: string]: any;
}
export interface Jwks {
  keys: JsonWebKey[];
}
export interface JsonWebKey {
  alg: "ES256" | "RS256";
  kid: string;
  kty: "EC" | "RSA";
  use: "sig" | "enc";
  crv?: string;
  d?: string;
  dp?: string;
  dq?: string;
  e?: string;
  ext?: boolean;
  k?: string;
  key_ops?: string[];
  n?: string;
  oth?: RsaOtherPrimesInfo[];
  p?: string;
  q?: string;
  qi?: string;
  x?: string;
  y?: string;
}
export interface JwtHeader {
  alg: "ES256" | "RS256";
  typ?: string | undefined;
  kid?: string;
}

export interface EncryptionKeyWrapper {
  publicEncryptionKey: CryptoKey;
  kid: string;
}
