import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: Number(process.env.MAILTRAP_PORT),
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: `"Prescripto+" <no-reply@prescripto.com>`,
    to,
    subject,
    html,
    text: text || "Please view this email in HTML format",
  };

  const tx = getTransporter();

  try {
    const info = await tx.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw error;
  }
};
export const emailVerificationTemplate = (url, username) => {
  return `
    <div>
      <h2>Email Verification</h2>
      <p>Hello ${username},</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${url}" target="_blank">Verify Email</a>
      <p>This link will expire in 20 minutes.</p>
    </div>
  `;
};

export const passwordResetTemplate = (resetUrl, username) => {
  return `
    <div>
      <h2>Password Reset</h2>
      <p>Hello ${username},</p>
      <p>Please reset your password by clicking the link below:</p>
      <a href="${resetUrl}" target="_blank">Reset Password</a>
      <p>This link will expire in 20 minutes.</p>
    </div>
  `;
};