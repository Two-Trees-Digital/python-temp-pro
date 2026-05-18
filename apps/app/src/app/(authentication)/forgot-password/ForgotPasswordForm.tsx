"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import LoadingDots from "@/components/loadingDots";

// TT-118: forgot-password form (marketing site).
// On success we render a "check your email" confirmation in place of the
// form — single-page UX, no navigation.
export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value.trim();

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      if (!res.ok) {
        // Server returns 400 only on malformed input; 200 on every other path
        // (no enumeration). So a non-OK here is genuinely user error.
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmittedEmail(email);
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 px-4 py-8 sm:px-16 text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h4 className="text-lg font-semibold mb-2">Check your email</h4>
        <p className="text-sm text-gray-600 mb-3">
          If an account exists for <strong>{submittedEmail}</strong>, we&apos;ve sent a password reset link there.
          The link expires in 1 hour.
        </p>
        <p className="text-sm text-gray-500">
          Don&apos;t see it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="font-semibold text-gray-800 underline"
          >
            try a different email
          </button>
          .
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="font-semibold text-gray-800">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col space-y-4 bg-gray-50 px-4 pt-8 pb-8 sm:px-16"
      >
        <div>
          <label htmlFor="email" className="block text-xs text-gray-600 uppercase">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="panic@thedis.co"
            autoComplete="email"
            required
            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <button
          disabled={loading}
          className={`${
            loading
              ? "cursor-not-allowed border-gray-200 bg-gray-100"
              : "border-black bg-black text-white hover:bg-white hover:text-black"
          } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
        >
          {loading ? <LoadingDots /> : <p>Send reset link</p>}
        </button>
        <p className="text-center text-sm text-gray-600">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-gray-800">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
