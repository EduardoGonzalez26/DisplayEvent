import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 8;

export function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("hex");
}