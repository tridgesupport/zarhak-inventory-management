import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false, // Brevo uses STARTTLS on 587, not implicit TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(input: { to: string; subject: string; html: string }) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
