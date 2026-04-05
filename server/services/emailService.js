const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
  });

  return transporter;
};

const FROM = `"${process.env.EMAIL_FROM_NAME || 'UptimeMonitor'}" <${process.env.EMAIL_FROM_ADDRESS}>`;

// ─── Generic send ───────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to} — ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ Email send failed: ${err.message}`);
    return false;
  }
};

// ─── Down Alert ─────────────────────────────────────────
const sendDownAlert = async ({ monitor, checkResult }) => {
  const subject = `🔴 DOWN: ${monitor.name} is not responding`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="background:#dc2626;color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">🔴 Monitor Alert: Site is DOWN</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px">Your monitored site has been detected as <strong>DOWN</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Monitor</td><td style="padding:8px">${monitor.name}</td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">URL</td><td style="padding:8px"><a href="${monitor.url}">${monitor.url}</a></td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Status</td><td style="padding:8px;color:#dc2626"><strong>${checkResult.status.toUpperCase()}</strong></td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">HTTP Code</td><td style="padding:8px">${checkResult.statusCode || 'N/A'}</td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Error</td><td style="padding:8px">${checkResult.errorMessage || 'No response'}</td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Time</td><td style="padding:8px">${new Date(checkResult.checkedAt).toUTCString()}</td></tr>
        </table>
        <p style="color:#666;font-size:13px;margin-top:24px">UptimeMonitor will continue checking and notify you when the site recovers.</p>
      </div>
      <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
        UptimeMonitor — Automated Alert System
      </div>
    </div>
  `;
  const text = `DOWN ALERT\nMonitor: ${monitor.name}\nURL: ${monitor.url}\nStatus: ${checkResult.status}\nTime: ${new Date(checkResult.checkedAt).toUTCString()}`;

  for (const email of monitor.alertEmails) {
    await sendMail({ to: email, subject, html, text });
  }
};

// ─── Recovery Alert ──────────────────────────────────────
const sendRecoveryAlert = async ({ monitor, checkResult }) => {
  const subject = `✅ RECOVERED: ${monitor.name} is back online`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="background:#16a34a;color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">✅ Monitor Recovery: Site is UP</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px">Your monitored site has <strong>recovered</strong> and is responding normally.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Monitor</td><td style="padding:8px">${monitor.name}</td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">URL</td><td style="padding:8px"><a href="${monitor.url}">${monitor.url}</a></td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Status</td><td style="padding:8px;color:#16a34a"><strong>UP</strong></td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Response Time</td><td style="padding:8px">${checkResult.responseTimeMs}ms</td></tr>
          <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Recovered At</td><td style="padding:8px">${new Date(checkResult.checkedAt).toUTCString()}</td></tr>
        </table>
      </div>
      <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
        UptimeMonitor — Automated Alert System
      </div>
    </div>
  `;
  const text = `RECOVERY ALERT\nMonitor: ${monitor.name}\nURL: ${monitor.url}\nRecovered At: ${new Date(checkResult.checkedAt).toUTCString()}`;

  for (const email of monitor.alertEmails) {
    await sendMail({ to: email, subject, html, text });
  }
};

// ─── Email Verification ──────────────────────────────────
const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  const subject = 'Verify your UptimeMonitor email';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="background:#2563eb;color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">Welcome to UptimeMonitor</h1>
      </div>
      <div style="padding:24px">
        <p>Hi ${name},</p>
        <p>Please verify your email address by clicking the button below. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Verify Email</a>
        <p style="color:#666;font-size:12px;margin-top:24px">Or copy this link: ${verifyUrl}</p>
      </div>
    </div>
  `;
  return sendMail({ to, subject, html, text: `Verify email: ${verifyUrl}` });
};

// ─── Password Reset ───────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Reset your UptimeMonitor password';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="background:#dc2626;color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">Password Reset Request</h1>
      </div>
      <div style="padding:24px">
        <p>Hi ${name},</p>
        <p>A password reset was requested for your account. Click the button below. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Reset Password</a>
        <p style="color:#666;font-size:13px;margin-top:24px">If you didn't request this, please ignore this email. Your password will not change.</p>
      </div>
    </div>
  `;
  return sendMail({ to, subject, html, text: `Reset password: ${resetUrl}` });
};

module.exports = {
  sendMail,
  sendDownAlert,
  sendRecoveryAlert,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
