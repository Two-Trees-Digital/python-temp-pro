"use client";

import React from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/components/layout";

export default function Profile() {
  const { data, status } = useSession();
  const router = useRouter();

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading") {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-68px)] flex items-center justify-center">
          <p className="text-gray-500">Loading…</p>
        </div>
      </Layout>
    );
  }

  const user = data?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-68px)] bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5 flex items-center gap-6">
            {user?.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.name ?? "Profile"}
                width={80}
                height={80}
                className="rounded-full object-cover w-20 h-20 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">{initials}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 m-0">{user?.name}</h1>
              <p className="text-gray-500 mt-1 text-sm">{user?.email}</p>
              {user?.role && (
                <span className="inline-block mt-2 px-3 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wide">
                  {user.role.name}
                </span>
              )}
            </div>
          </div>

          {/* Details card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              Account Details
            </p>
            <dl className="divide-y divide-gray-100">
              {[
                { label: "Name", value: user?.name },
                { label: "Email", value: user?.email },
                {
                  label: "Sign-in method",
                  value: user?.authProvider
                    ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)
                    : "Credentials",
                },
                {
                  label: "Email verified",
                  value: user?.isEmailVerified
                    ? <span className="text-green-600 font-semibold">Verified</span>
                    : <span className="text-yellow-600 font-semibold">Not verified</span>,
                },
              ].map(({ label, value }) => (
                <div key={label} className="py-3 flex justify-between">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Sign out */}
          <div className="flex justify-end">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
}
