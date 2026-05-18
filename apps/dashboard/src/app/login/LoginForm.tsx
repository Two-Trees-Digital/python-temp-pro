"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";

// TT-118: dashboard sign-in form. Custom UI replacing NextAuth's default
// /api/auth/signin page. Includes:
//   - Credentials form (email + password)
//   - Conditional OAuth buttons (Google + GitHub) based on server-side
//     env-var presence (passed in as props from the page server component)
//   - Forgot password? link to the marketing site (the canonical
//     forgot-password UI lives there)
//   - ?error= and ?reset= query-param toasts

const FORGOT_PASSWORD_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/forgot-password"
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com") + "/forgot-password";

const ERROR_MESSAGES: Record<string, string> = {
  verify_email_first:
    "An account with this email already exists. Sign in with your password first, then link your social account from settings.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Use the original method to sign in.",
  AccessDenied: "Access denied. Please try again or contact support.",
  CredentialsSignin: "Invalid email or password.",
};

export default function LoginForm({
  googleEnabled,
  githubEnabled,
}: {
  googleEnabled: boolean;
  githubEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) {
      toast.error(ERROR_MESSAGES[code] ?? `Sign-in failed: ${code}`);
    }
    if (searchParams.get("reset") === "success") {
      toast.success("Password updated. Sign in with your new password.");
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const res = await signIn("credentials", {
      redirect: false,
      email:    (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    });

    setLoading(false);

    if (res?.error) {
      toast.error(ERROR_MESSAGES[res.error] ?? res.error);
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <>
      <Toaster position="top-center" />
      <form onSubmit={handleCredentialsSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16, textAlign: "right" }}>
          <a href={FORGOT_PASSWORD_URL} style={{ fontSize: 13, color: "#111", fontWeight: 500, textDecoration: "none" }}>
            Forgot password?
          </a>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {(googleEnabled || githubEnabled) && (
        <>
          <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 12 }}>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid #eee" }} />
            <span style={{ fontSize: 12, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>or</span>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid #eee" }} />
          </div>
          {googleEnabled && (
            <button type="button" onClick={() => signIn("google", { callbackUrl })} style={oauthButtonStyle}>
              Continue with Google
            </button>
          )}
          {githubEnabled && (
            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl })}
              style={{ ...oauthButtonStyle, marginTop: googleEnabled ? 8 : 0 }}
            >
              Continue with GitHub
            </button>
          )}
        </>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

const oauthButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 16px",
  background: "#fff",
  color: "#111",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
