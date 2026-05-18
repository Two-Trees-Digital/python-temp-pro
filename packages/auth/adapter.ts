import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";

/**
 * TT-118: NextAuth Prisma adapter wrapper.
 *
 * NextAuth's PrismaAdapter expects a User table that follows its canonical
 * schema (id, name?, email?, image?, emailVerified DateTime?). Our User
 * schema (mirrored from the platform) diverges in three ways:
 *
 *  1. `image` → we call it `profileImage`
 *  2. `emailVerified DateTime?` → we use `isEmailVerified Boolean?`
 *  3. `roleId` is required (FK to Role table) — NextAuth doesn't know about it,
 *     so vanilla createUser() would FK-error
 *
 * This wrapper:
 *  - Overrides createUser to resolve the default "USER" role + map fields
 *  - Overrides getUser / getUserByEmail / getUserByAccount to shape-map
 *    Prisma rows into AdapterUser (so NextAuth gets what it expects)
 *  - Returns extended User objects that ALSO carry our role/profileImage/
 *    authProvider so the jwt callback can populate the full SessionUser
 *    without a re-fetch
 */
export function buildPrismaAdapter(prisma: any): Adapter {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,

    async createUser(data: Omit<AdapterUser, "id">) {
      // Resolve (or create) the default USER role.
      let role = await prisma.role.findUnique({ where: { name: "USER" } });
      if (!role) {
        role = await prisma.role.create({ data: { name: "USER" } });
      }

      const user = await prisma.user.create({
        data: {
          email:           data.email!,
          name:            data.name ?? data.email!.split("@")[0],
          profileImage:    data.image ?? null,
          isEmailVerified: data.emailVerified !== null,
          authProvider:    null,
          roleId:          role.id,
        },
        include: {
          role: { select: { id: true, name: true, superAdmin: true } },
        },
      });

      return mapToAdapterUser(user);
    },

    async getUser(id: string) {
      const user = await prisma.user.findUnique({
        where:   { id },
        include: { role: { select: { id: true, name: true, superAdmin: true } } },
      });
      return user ? mapToAdapterUser(user) : null;
    },

    async getUserByEmail(email: string) {
      const user = await prisma.user.findUnique({
        where:   { email },
        include: { role: { select: { id: true, name: true, superAdmin: true } } },
      });
      return user ? mapToAdapterUser(user) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where:   { provider_providerAccountId: { provider, providerAccountId } },
        include: {
          user: {
            include: {
              role: { select: { id: true, name: true, superAdmin: true } },
            },
          },
        },
      });
      return account?.user ? mapToAdapterUser(account.user) : null;
    },

    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          ...(data.email          !== undefined ? { email:           data.email           } : {}),
          ...(data.name           !== undefined ? { name:            data.name ?? ""      } : {}),
          ...(data.image          !== undefined ? { profileImage:    data.image           } : {}),
          ...(data.emailVerified  !== undefined ? { isEmailVerified: data.emailVerified !== null } : {}),
        },
        include: { role: { select: { id: true, name: true, superAdmin: true } } },
      });
      return mapToAdapterUser(user);
    },
  };
}

function mapToAdapterUser(user: any): AdapterUser & {
  profileImage: string | null;
  isEmailVerified: boolean | null;
  authProvider: string | null;
  role: { id: string; name: string; superAdmin: boolean } | null;
} {
  return {
    id:              user.id,
    email:           user.email,
    name:            user.name,
    image:           user.profileImage,
    emailVerified:   user.isEmailVerified ? new Date() : null,
    profileImage:    user.profileImage,
    isEmailVerified: user.isEmailVerified,
    authProvider:    user.authProvider,
    role:            user.role ?? null,
  };
}
