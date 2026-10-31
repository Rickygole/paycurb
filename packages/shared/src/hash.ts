import { createHash } from "node:crypto";
import { canonicalJson } from "./canonical";

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
export const hashPayload = (payload: unknown) => sha256(canonicalJson(payload));
