/**
 * Reject unsafe API requests that did not originate from this exact site origin.
 * Browser writes normally include Origin; Sec-Fetch-Site is the constrained fallback.
 */
export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const supplied = new URL(origin);
      const target = new URL(request.url);
      return supplied.origin === target.origin
        && supplied.pathname === "/" && supplied.search === "" && supplied.hash === ""
        && supplied.username === "" && supplied.password === "";
    } catch {
      return false;
    }
  }

  // Do not accept cross-site, same-site sibling subdomains, or requests with no
  // browser-origin signal. The application API is used by the same-site web UI.
  return request.headers.get("sec-fetch-site") === "same-origin";
}
