"use server";

import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

/**
 * Re-sends the confirm-your-email link for the signed-in user.
 *
 * Uses the Resend provider's sign-in link: following it verifies the address
 * (the adapter stamps `emailVerified`) as well as signing them in, so no second
 * token type is needed.
 */
export async function resendVerification(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user?.email || user.emailVerified) return { ok: false };

  try {
    await signIn("resend", { email: user.email, redirect: false });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
