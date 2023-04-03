
export interface JarPayload {
  [key: string]: any
  sub: string
  redirect_uri: string
  client_id: string
  response_type: 'code'
  state: string
  exp: number
  nbf: number
  iat: number
  aud?: string | string[]
  scope?: string
  nonce?: string
  iss?: string
}
export interface Jwks {
  keys: JsonWebKey[]
}
export interface JsonWebKey {
  alg: 'ES256' | 'RS256'
  kid: string
  kty: 'EC' | 'RSA'
  use: 'sig' | 'enc'
  crv?: string
  d?: string
  dp?: string
  dq?: string
  e?: string
  ext?: boolean
  k?: string
  key_ops?: string[]
  n?: string
  oth?: RsaOtherPrimesInfo[]
  p?: string
  q?: string
  qi?: string
  x?: string
  y?: string
}
export interface JwtHeader {
  alg: 'ES256' | 'RS256'
  typ?: string | undefined
  kid?: string
}
