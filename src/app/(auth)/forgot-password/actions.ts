"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/passwordReset";
import { sendMail } from "@/lib/mailer";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export interface ForgotPasswordState {
  error?: string;
  submitted?: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always report success — confirming whether an email is registered would let
  // anyone enumerate real accounts.
  if (user) {
    const rawToken = await createPasswordResetToken(user.id);
    const host = (await headers()).get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    const resetUrl = `${protocol}://${host}/reset-password?token=${rawToken}`;

    await sendMail({
      to: user.email,
      subject: "Reset your Zarhak Inventory Management password",
      html: `
        <p>Someone requested a password reset for this account.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  }

  return { submitted: true };
}
