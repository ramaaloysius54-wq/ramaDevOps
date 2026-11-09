import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-development-key-change-it"
);

export interface JWTPayloadData {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function signJWT(payload: JWTPayloadData): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifyJWT(token: string): Promise<JWTPayloadData | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayloadData;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<JWTPayloadData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("rama_auth_token")?.value;
  if (!token) return null;

  const verified = await verifyJWT(token);
  if (!verified) return null;

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return verified;
}
