export type ClientError = { code: string; message: string };

export function toClientError(error: unknown): ClientError {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";

  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return { code: "AUTH_INVALID", message: "Your email or password is incorrect." };
  }

  if (raw.includes("row-level security") || raw.includes("not allowed") || raw.includes("permission denied")) {
    return { code: "NOT_ALLOWED", message: "You are not allowed to do that." };
  }

  if (raw.includes("already exists") || raw.includes("duplicate")) {
    return { code: "ALREADY_EXISTS", message: "That record already exists." };
  }

  return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
}
