import { customAlphabet } from "nanoid";

// URL-safe, unambiguous alphabet (no look-alikes), 24 chars ~= 143 bits.
// This token IS the auth boundary — it must be unguessable.
const alphabet = "0123456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const generate = customAlphabet(alphabet, 24);

export function newUserToken(): string {
  return generate();
}
