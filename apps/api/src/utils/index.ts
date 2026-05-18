import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";

const privateKey = config.get("PRIVATE_KEY") as string;

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
) => {
  try {
    const passwordMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return passwordMatch;
  } catch (error) {
    return false;
  }
};

export const generateAuthToken = (
  values: object,
  expireValue?: string | number
) => {
  return jwt.sign(values, privateKey!, {
    expiresIn: expireValue || "1d",
  });
};

export const decodeAuthToken = (token: string) => {
  try {
    return jwt.verify(token, privateKey!);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
