export async function verifyTurnstile(token: string, ip?: string) {
  if (process.env.TURNSTILE_DISABLED === "true") return true;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return process.env.NODE_ENV !== "production";
  if (!token || token.length > 4096) return false;

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip && ip !== "unknown") formData.append("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
