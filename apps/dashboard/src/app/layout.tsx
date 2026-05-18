import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import Provider from "@/context/client-provider";
import "./globals.css";

// Required for Vercel monorepo deployments — prevents static prerendering
// which causes routing 404s when built via turbo from a non-root directory.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard",
};

// TT-118: auth + role redirects moved to middleware (./middleware.ts).
// Layout now only fetches the session for the client Provider — no
// redirects, no role checks. Middleware guarantees that by the time we
// render here, the user is either on /login (always public) or signed
// in as an ADMIN.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider session={session}>{children}</Provider>
      </body>
    </html>
  );
}
