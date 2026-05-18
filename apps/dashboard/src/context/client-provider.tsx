"use client";

import { SessionProvider } from "next-auth/react";

type Props = {
  children: React.ReactNode;
  session: any;
};

export default function Provider({ children, session }: Props): React.ReactNode {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
