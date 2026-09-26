const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendPasswordResetEmail = async (to, webResetLink, expoResetLink) => {
  const transporter = createTransporter();

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

const sendVerificationEmail = async (to, verifyLink) => {
  const transporter = createTransporter();
  const safeHref = String(verifyLink).replace(/"/g, '&quot;');

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify your Rent Manager email',
    text: `You registered on Rent Manager with this email address (${to}).\n\nPlease verify this email to confirm that the account belongs to you. You cannot log in until your email is verified.\n\nThis verification link expires in 24 hours.\n\nOpen this email on your phone or computer and tap Verify Email.\n\nIf you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1A1A;">
        <p>You registered on <strong>Rent Manager</strong> using this email address:</p>
        <p><strong>${to}</strong></p>
        <p>Please verify this email to confirm that the account belongs to you. You cannot log in until your email is verified.</p>
        <p><strong>This verification link expires in 24 hours.</strong></p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
          <tr>
            <td align="center" bgcolor="#323a8f" style="border-radius:8px;">
              <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#323a8f;border:1px solid #323a8f;">
                Verify Email
              </a>
            </td>
          </tr>
        </table>
        <p>You can open this email on your phone or computer. It verifies the same account.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendEmailChangeVerification = async (to, verifyLink) => {
  const transporter = createTransporter();
  const safeHref = String(verifyLink).replace(/"/g, '&quot;');

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify your new Rent Manager email',
    text: `You asked to change your Rent Manager account email to ${to}.\n\nPlease verify this new email. Until you verify, you will keep using your current email to log in.\n\nThis verification link expires in 24 hours.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1A1A;">
        <p>You asked to change your <strong>Rent Manager</strong> account email to:</p>
        <p><strong>${to}</strong></p>
        <p>Please verify this new email. Until you verify, you will keep using your current email to log in.</p>
        <p><strong>This verification link expires in 24 hours.</strong></p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
          <tr>
            <td align="center" bgcolor="#323a8f" style="border-radius:8px;">
              <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#323a8f;border:1px solid #323a8f;">
                Verify Email
              </a>
            </td>
          </tr>
        </table>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendContactEmail = async ({
  adminEmail,
  userName,
  userEmail,
  subject,
  message,
  sentAt,
}) => {
  const transporter = createTransporter();
  const when = sentAt.toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: adminEmail,
    replyTo: userEmail,
    subject: `Rent Manager Contact Us: ${subject}`,
    text: `Contact Us / User Feedback\n\nUser Name: ${userName}\nUser Email: ${userEmail}\nSubject: ${subject}\n\nMessage:\n${message}\n\nDate & Time: ${when}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1A1A;">
        <h2 style="color:#323a8f;">Contact Us / User Feedback</h2>
        <p><strong>User Name:</strong> ${userName}</p>
        <p><strong>User Email:</strong> ${userEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;">${message.replace(/</g, '&lt;')}</p>
        <p><strong>Date & Time:</strong> ${when}</p>
      </div>
    `,
  });
};

const formatContact = (email, phone) => {
  const parts = [];
  if (email) {
    parts.push(email);
  }
  if (phone) {
    parts.push(phone);
  }
  return parts.length ? parts.join(', ') : 'N/A';
};

const formatDaysAfterStart = (days) => {
  if (days == null || Number.isNaN(Number(days))) {
    return 'N/A';
  }
  const count = Math.max(0, Math.round(Number(days)));
  if (count === 0) {
    return 'Removed on the lease start date';
  }
  return `Removed ${count} day${count === 1 ? '' : 's'} after lease start`;
};

const sendTenantRemovalDisputeEmail = async ({
  tenantName,
  tenantEmail,
  tenantPhone,
  ownerName,
  ownerEmail,
  ownerPhone,
  assetName,
  assetType,
  assetLocation,
  reason,
  rentCycleStatus,
  daysAfterLeaseStart,
}) => {
  const to = String(
    process.env.DISPUTE_EMAIL || process.env.ADMIN_EMAIL || ''
  )
    .trim()
    .toLowerCase();

  if (!to) {
    console.warn(
      'DISPUTE_EMAIL / ADMIN_EMAIL is not set — skip tenant-removal dispute email'
    );
    return;
  }

  const transporter = createTransporter();
  const cycle = rentCycleStatus === 'Paid' ? 'Paid' : 'Unpaid';
  const typeLine = assetType || 'N/A';
  const locationLine = assetLocation || 'N/A';
  const ownerContact = formatContact(ownerEmail, ownerPhone);
  const tenantContact = formatContact(tenantEmail, tenantPhone);
  const removedAfterStart = formatDaysAfterStart(daysAfterLeaseStart);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Rent Manager: tenant removed from ${assetName}`,
    text: [
      'App: Rent Manager',
      '',
      'An owner has removed a tenant during an active lease.',
      '',
      `Asset: ${assetName}`,
      `Type: ${typeLine}`,
      `Location: ${locationLine}`,
      '',
      `Owner: ${ownerName} (${ownerContact})`,
      `Tenant: ${tenantName} (${tenantContact})`,
      '',
      `Current cycle rent: ${cycle}`,
      removedAfterStart,
      '',
      `Reason: ${reason}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1A1A;">
        <p><strong>App: Rent Manager</strong></p>
        <p>An owner has removed a tenant during an active lease.</p>
        <p><strong>Asset:</strong> ${assetName}<br/>
        <strong>Type:</strong> ${typeLine}<br/>
        <strong>Location:</strong> ${locationLine}</p>
        <p><strong>Owner:</strong> ${ownerName} (${ownerContact})<br/>
        <strong>Tenant:</strong> ${tenantName} (${tenantContact})</p>
        <p><strong>Current cycle rent:</strong> ${cycle}</p>
        <p>${removedAfterStart}</p>
        <p><strong>Reason:</strong></p>
        <p style="white-space:pre-wrap;">${String(reason).replace(/</g, '&lt;')}</p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendEmailChangeVerification,
  sendContactEmail,
  sendTenantRemovalDisputeEmail,
};
