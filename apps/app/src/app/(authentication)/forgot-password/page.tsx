import { Metadata } from "next";
import Image from "next/image";

import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
          <h3 className="text-xl font-semibold">Reset your password</h3>
          <p className="text-sm text-pretty text-gray-500">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Forgot Password",
};
