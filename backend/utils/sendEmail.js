const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (to, webResetLink, expoResetLink) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Rent Manager password reset',
    text: `Reset your Rent Manager password. This link expires in 15 minutes and can be used only once.\n\nOn laptop browser, open this link:\n${webResetLink}\n\nOn phone Expo Go, copy and paste this link:\n${expoResetLink}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>Reset your Rent Manager password. This link expires in 15 minutes and can be used only once.</p>
      <p><strong>On laptop browser:</strong></p>
      <p>
        <a href="${webResetLink}" style="display:inline-block;padding:12px 24px;background:#1a237e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link:</p>
      <p>${webResetLink}</p>
      <p><strong>On phone with Expo Go (copy and paste, Gmail will not make this clickable):</strong></p>
      <p>${expoResetLink}</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};

module.exports = { sendPasswordResetEmail };