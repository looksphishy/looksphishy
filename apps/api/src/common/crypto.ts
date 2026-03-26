import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

export function encryptUrl(url: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex")
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv)

  const encrypted = Buffer.concat([cipher.update(url, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decryptUrl(encrypted: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex")
  const data = Buffer.from(encrypted, "base64")

  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const content = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(content) + decipher.final("utf8")
}
