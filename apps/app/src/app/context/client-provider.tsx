"use client";

import { SessionProvider } from "next-auth/react";

type props = {
  children: React.ReactNode;
  session: any;
};
export default function Provider({ children, session }: props): React.ReactNode {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
