import { Metadata } from "next";
import Image from "next/image";

import RegistrationForm from "./RegisterForm";

export default function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-2 border-b border-gray-200 bg-white px-4 py-4 text-center sm:px-16">
          <Image
            className="size-10 rounded-full"
            src="/logo.png"
            width={20}
            height={20}
            priority
            alt="Logo"
          />
          <h3 className="text-xl font-semibold">Sign Up</h3>
          <p className="text-sm text-pretty text-gray-500">
            Create an account with your email and password
          </p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Register",
};
