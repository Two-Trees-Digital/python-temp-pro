"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

type props = {
  children: React.ReactNode;
};
export default function ApolloClientProvider({
  children,
}: props): React.ReactNode {
  const router = useRouter();
  const session = useSession();

  // useEffect(() => {
  //   if (!session?.data) {
  //     router.replace("/login");
  //   }
  // }, []);

  const client = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_BACKEND_URL,
    cache: new InMemoryCache(),
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
