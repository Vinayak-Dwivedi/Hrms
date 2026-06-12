import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MIN_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

export const passwordFieldSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
  .max(256, "Password must be at most 256 characters.");

/** Empty or omitted passwords are allowed; non-empty values must meet policy. */
export const optionalPasswordFieldSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  passwordFieldSchema.optional(),
);
