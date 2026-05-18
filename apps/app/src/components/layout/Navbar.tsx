"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data } = useSession();

  return (
    <header className="w-full bg-black px-4">
      <nav className="max-w-[85rem] mx-auto flex items-center justify-between">
        <Link className="flex-none text-xl font-medium text-white" href="/">
          Todo App
        </Link>

        <div className="flex items-center gap-x-7 ps-7">
          {data?.user ? (
            <div className="flex items-center space-x-4">
              <Link
                className="font-medium text-white/[.8] hover:text-white py-6"
                href="/create-todo"
              >
                Create Todo
              </Link>

              {/* Profile avatar link */}
              <Link
                href="/profile"
                className="flex items-center gap-x-2 font-medium text-white/[.8] hover:text-white border-s border-white/[.3] my-6 ps-6 group"
                title={data.user.name ?? "Profile"}
              >
                {data.user.profileImage ? (
                  <Image
                    src={data.user.profileImage}
                    alt={data.user.name ?? "Profile"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover w-8 h-8 ring-2 ring-white/30 group-hover:ring-white transition-all"
                  />
                ) : (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 ring-2 ring-white/30 group-hover:ring-white transition-all">
                    <svg
                      className="w-4 h-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                )}
                <span className="hidden sm:inline">Profile</span>
              </Link>

              {/* Logout */}
              <button
                className="font-medium text-white/[.8] hover:text-white text-sm"
                onClick={() => signOut()}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              className="flex items-center gap-x-2 font-medium text-white/[.8] hover:text-white border-s border-white/[.3] my-6 ps-6"
              href="/login"
            >
              <svg
                className="flex-shrink-0 w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
