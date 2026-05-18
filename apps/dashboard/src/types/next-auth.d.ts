import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      profileImage: string | null;
      token: string;
      authProvider: string | null;
      isEmailVerified: boolean | null;
      role: {
        id: string;
        name: string;
      };
    };
  }
}
