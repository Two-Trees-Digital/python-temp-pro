import { Metadata } from "next";
import Image from "next/image";

import LoginForm from "./LoginForm";

// TT-118: gate the Google button on server-side env-var presence so the
// button doesn't render (and 500 on click) when OAuth isn't configured.
export default function Login() {
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <Image
            className="size-10 rounded-full"
            src="/logo.png"
            width={20}
            height={20}
            priority
            alt="Logo"
          />
          <h3 className="text-xl font-semibold">Sign In</h3>
          <p className="text-sm text-pretty text-gray-500">
            Use your email and password to sign in
          </p>
        </div>
        <LoginForm googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Login",
};
