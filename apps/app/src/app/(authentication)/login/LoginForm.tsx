"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";

import LoadingDots from "@/components/loadingDots";

// TT-118: marketing-site sign-in form. Adds:
//   - Forgot password? link → /forgot-password
//   - ?error= and ?reset= query-param toast handling
//   - react-hot-toast <Toaster /> mount
//   - Conditional Google button (env-gated via prop) — GitHub deliberately
//     not exposed here because the marketing site has only one OAuth
//     callback URL and we let the dashboard own the GitHub linkage.

const ERROR_MESSAGES: Record<string, string> = {
  verify_email_first:
    "An account with this email already exists. Sign in with your password first, then link your social account from settings.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Use the original method to sign in.",
  AccessDenied: "Access denied. Please try again or contact support.",
  CredentialsSignin: "Invalid email or password.",
};

const LoginForm = ({ googleEnabled = true }: { googleEnabled?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) {
      toast.error(ERROR_MESSAGES[code] ?? `Sign-in failed: ${code}`);
    }
    if (searchParams.get("reset") === "success") {
      toast.success("Password updated. Sign in with your new password.");
    }
  }, [searchParams]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    router.push("/");
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <Toaster position="top-center" />
      <form
        onSubmit={handleFormSubmit}
        className="w-full flex flex-col space-y-4 bg-gray-50 px-4 pt-8 sm:px-16"
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
        <div>
          <label htmlFor="password" className="block text-xs text-gray-600 uppercase">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-gray-800">
            Forgot password?
          </Link>
        </div>
        <button
          disabled={loading}
          className={`${
            loading
              ? "cursor-not-allowed border-gray-200 bg-gray-100"
              : "border-black bg-black text-white hover:bg-white hover:text-black"
          } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
        >
          {loading ? <LoadingDots /> : <p>Sign In</p>}
        </button>
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-gray-800">
            Sign up
          </Link>{" "}
          for free.
        </p>
      </form>

      {googleEnabled && (
        <button
          type="button"
          className="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center my-4"
          onClick={() => signIn("google")}
        >
          <svg
            className="w-4 h-4 me-2"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 18 19"
          >
            <path
              fillRule="evenodd"
              d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
              clipRule="evenodd"
            />
          </svg>
          Sign in with Google
        </button>
      )}
    </div>
  );
};

export default LoginForm;
