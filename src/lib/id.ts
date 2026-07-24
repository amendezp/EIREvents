import crypto from "node:crypto";

export const newId = () => crypto.randomUUID();

// No 0/O/1/I/L to keep codes easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function shortCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
