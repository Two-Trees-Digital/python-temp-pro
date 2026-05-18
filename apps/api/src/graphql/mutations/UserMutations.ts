import { User } from "database/client";
import { QueueMQ } from "queue";
import client from "../../lib/prisma";
import {
  hashPassword,
  generateAuthToken,
  comparePassword,
  decodeAuthToken,
} from "../../utils";

const UserQueries = {
  // Register User
  registerUser: async (_, { content: payload }: { content: User }) => {
    try {
      const userExist = await client.user.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (userExist) throw new Error("Email already exists");

      payload.password = await hashPassword(payload.password!);

      if (!payload.roleId) {
        const role = await client.role.findUnique({
          where: {
            name: "USER",
          },
        });
        payload.roleId = role?.id || "";
      }

      const user = await client.user.create({
        data: payload,
        include: {
          role: true,
        },
      });

      // Verification email queue
      try {
        const token = generateAuthToken({ userId: user.id }, "1d");
        await QueueMQ("email-verification-queue").add("email-verification", {
          name: user.name,
          email: user.email,
          token,
        });
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
          throw new Error(`Queue Job Failed: ${error.message}`);
        } else {
          console.log(error);
          throw new Error(`Queue Job Failed: ${error}`);
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        token: generateAuthToken(
          {
            id: user.id,
          },
          "30d"
        ),
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  // Login user
  loginUser: async (_, { content: payload }: { content: User }) => {
    try {
      const user = await client.user.findUnique({
        where: {
          email: payload.email,
        },
        include: {
          role: true,
        },
      });

      if (!user) throw new Error("Invalid credentials");

      const passwordMatch = await comparePassword(
        payload.password!,
        user.password!
      );

      if (!passwordMatch) throw new Error("Invalid credentials");

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        token: generateAuthToken(
          {
            id: user.id,
          },
          "30d"
        ),
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  // Login Admin
  adminLogin: async (_, { content: payload }: { content: User }) => {
    try {
      const user = await client.user.findUnique({
        where: {
          email: payload.email,
        },
        include: {
          role: true,
        },
      });

      if (!user) throw new Error("Invalid credentials");

      const passwordMatch = await comparePassword(
        payload.password!,
        user.password!
      );

      if (!passwordMatch) throw new Error("Invalid credentials");

      if (user.role.name !== "ADMIN") throw new Error("Access denied");

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        token: generateAuthToken(
          {
            id: user.id,
          },
          "30d"
        ),
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  // Verify Email
  verifyEmail: async (_, { token }: { token: string }) => {
    try {
      const decodedToken: any = decodeAuthToken(token);

      if (!decodedToken || !decodedToken.userId) {
        throw new Error("Invalid or expired token");
      }

      const user = await client.user.findUnique({
        where: { id: decodedToken.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.isEmailVerified) {
        return {
          error: false,
          message: "Email already verified",
          user: user,
        };
      }

      const updatedUser = await client.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });

      return {
        error: false,
        message: "Email verified successfully",
        user: updatedUser,
      };
    } catch (error: any) {
      return {
        error: true,
        message: error.message || "Unexpected error during email verification",
        user: null,
      };
    }
  },
};

export default UserQueries;
