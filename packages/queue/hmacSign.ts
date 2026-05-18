// HMAC-signed HTTP client for Node → Python service-to-service calls.
//
// Mirrors the verification contract enforced by python-temp-pro-service's
// app/auth.py:
//   HMAC-SHA256("{timestamp}.{body}", HMAC_SHARED_SECRET)
//   Headers:
//     X-Signature: sha256=<hex>
//     X-Timestamp: <unix-seconds>
//
// HMAC_SHARED_SECRET must be set IDENTICALLY on Vercel (Node side) and
// Railway (Python service). Mismatch → silent 401 on every cross-service
// call. Don't quote the value in either provider's UI.

import { createHmac } from "node:crypto";

export interface SignedRequestOpts {
  url:        string;          // Full URL — e.g. `${PYTHON_SERVICE_URL}/my-endpoint`
  body:       unknown;         // Will JSON.stringify'd before signing
  secret:     string;          // HMAC_SHARED_SECRET
  timeoutMs?: number;          // Default 30s
}

export interface SignedResponse<T = unknown> {
  ok:     boolean;
  status: number;
  data?:  T;
  error?: string;
}

/**
 * POST a JSON body to a Python service endpoint with HMAC signature
 * headers. Returns a normalized result rather than throwing — callers
 * inspect `ok` + `error`.
 */
export async function signedPost<T = unknown>(opts: SignedRequestOpts): Promise<SignedResponse<T>> {
  const { url, body, secret, timeoutMs = 30_000 } = opts;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyJson  = JSON.stringify(body);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${bodyJson}`)
    .digest("hex");

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature":  `sha256=${signature}`,
        "X-Timestamp":  timestamp,
      },
      body:   bodyJson,
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: T | undefined;
    try {
      parsed = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      // Non-JSON body — leave parsed undefined; caller can inspect status.
    }

    if (!res.ok) {
      return {
        ok:     false,
        status: res.status,
        data:   parsed,
        error:  `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    return { ok: true, status: res.status, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
