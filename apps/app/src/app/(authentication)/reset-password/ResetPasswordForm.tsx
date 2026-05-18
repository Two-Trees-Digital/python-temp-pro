"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import LoadingDots from "@/components/loadingDots";

const MIN_LENGTH = 12;

// TT-118: reset-password form (marketing site).
// Reads ?token=... from URL. If missing, shows a "broken link" state
// instead of letting the user submit a doomed form.
export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 px-4 py-8 sm:px-16 text-center">
        <p className="text-sm text-red-600 mb-4">
          This reset link is missing its token. It may have been mistyped or truncated by your email client.
        </p>
        <p className="text-sm">
          <Link href="/forgot-password" className="font-semibold text-gray-800">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form        = e.currentTarget;
    const newPassword = (form.elements.namedItem("newPassword")     as HTMLInputElement).value;
    const confirm     = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (newPassword !== confirm) {
      toast.error("Passwords don't match.");
      setLoading(false);
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      toast.error(`Password must be at least ${MIN_LENGTH} characters.`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, newPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Couldn't reset password. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Password updated. Sign in with your new password.");
      router.push("/login?reset=success");
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col space-y-4 bg-gray-50 px-4 pt-8 pb-8 sm:px-16"
      >
        <div>
          <label htmlFor="newPassword" className="block text-xs text-gray-600 uppercase">
            New Password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder={`${MIN_LENGTH}+ characters`}
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            required
            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-xs text-gray-600 uppercase">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repeat new password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
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
          {loading ? <LoadingDots /> : <p>Update password</p>}
        </button>
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-semibold text-gray-800">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
