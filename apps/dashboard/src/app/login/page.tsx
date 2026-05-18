import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Admin",
};

// TT-118: dashboard /login page. Middleware sends unauthenticated users
// here with ?callbackUrl= preserved so they land back on their intended
// page after sign-in.
export default function DashboardLoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fa",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #eee",
          padding: 40,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600 }}>Admin</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#666" }}>Sign in to continue</p>
        </div>

        <LoginForm
          googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
          githubEnabled={!!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)}
        />
      </div>
    </div>
  );
}
