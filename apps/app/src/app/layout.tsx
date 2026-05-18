import { getServerSession } from "next-auth/next";
import { Toaster } from "react-hot-toast";

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import Provider from "./context/client-provider";
import ApolloClientProvider from "./context/apollo-provider";
import "./globals.css";

// Required: getServerSession makes this layout dynamic; without this Next.js
// tries to statically analyze it and crashes during build.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Provider session={session}>
          <ApolloClientProvider>
            <Toaster />
            {children}
          </ApolloClientProvider>
        </Provider>
      </body>
    </html>
  );
}
