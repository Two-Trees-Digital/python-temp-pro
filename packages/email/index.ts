import { Resend } from "resend";

declare const process: { env: Record<string, string | undefined> };

// TT-118: Resend-based transactional email, mirrored from the platform
// (post-TT-124 migration). Two env vars in play:
//
//   RESEND_API_KEY      — required to actually send.
//   RESEND_FROM_EMAIL   — default sender. Falls back to a placeholder.
//
// Dev fallback: if NODE_ENV === "development" AND RESEND_API_KEY is unset,
// every send function logs the email to the console. Lets local dev test
// reset flows without provisioning Resend.
//
// In prod (or any non-dev), missing RESEND_API_KEY throws — fail loud
// so we don't silently drop transactional emails.

const apiKey           = process.env.RESEND_API_KEY;
const defaultFromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

const isDev = process.env.NODE_ENV === "development";

let _client: Resend | null = null;
function getClient(): Resend | null {
  if (_client) return _client;
  if (!apiKey) {
    if (isDev) return null; // dev fallback — log mode
    throw new Error(
      "RESEND_API_KEY is not set. Required to send transactional email in non-dev environments.",
    );
  }
  _client = new Resend(apiKey);
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email verification (kept for backward compat with worker — was Postmark
// template-based, now raw HTML via Resend so we don't need a per-env template)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendEmailVerificationMail(
  fromEmail: string,
  toEmail:   string,
  data:      { name?: string; link: string },
) {
  const client = getClient();
  if (!client) {
    console.warn("[email/sendEmailVerificationMail] DEV MODE — would send:", {
      fromEmail, toEmail, data,
    });
    return;
  }

  const { error } = await client.emails.send({
    from:    fromEmail,
    to:      toEmail,
    subject: "Verify your email",
    html:    renderVerifyHtml(data),
    text:    renderVerifyText(data),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite email — admin invites a new user. Link points at the password-reset
// page where the new user sets their initial password and is activated
// (isEmailVerified flips on consumePasswordReset success).
// ─────────────────────────────────────────────────────────────────────────────

export async function sendInviteEmail(args: {
  fromEmail?:    string;
  toEmail:       string;
  toName?:       string;
  inviteLink:    string;
  expiresInDays: number;
  invitedBy?:    string;
}): Promise<void> {
  const fromEmail = args.fromEmail ?? defaultFromEmail;
  const client    = getClient();

  if (!client) {
    console.warn("\n========== DEV MODE: would send invite email ==========");
    console.warn(`To:          ${args.toEmail}${args.toName ? ` (${args.toName})` : ""}`);
    console.warn(`From:        ${fromEmail}`);
    console.warn(`Invited by:  ${args.invitedBy ?? "(unknown)"}`);
    console.warn(`Subject:     You've been invited`);
    console.warn(`Expires:     ${args.expiresInDays} days`);
    console.warn(`Invite URL:  ${args.inviteLink}`);
    console.warn("=========================================================\n");
    return;
  }

  const { error } = await client.emails.send({
    from:    fromEmail,
    to:      args.toEmail,
    subject: "You've been invited",
    html:    renderInviteHtml(args),
    text:    renderInviteText(args),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Password reset email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(args: {
  fromEmail?:       string;
  toEmail:          string;
  toName?:          string;
  resetLink:        string;
  expiresInMinutes: number;
}): Promise<void> {
  const fromEmail = args.fromEmail ?? defaultFromEmail;
  const client    = getClient();

  if (!client) {
    console.warn("\n========== DEV MODE: would send password reset email ==========");
    console.warn(`To:        ${args.toEmail}${args.toName ? ` (${args.toName})` : ""}`);
    console.warn(`From:      ${fromEmail}`);
    console.warn(`Subject:   Reset your password`);
    console.warn(`Expires:   ${args.expiresInMinutes} minutes`);
    console.warn(`Reset URL: ${args.resetLink}`);
    console.warn("================================================================\n");
    return;
  }

  const { error } = await client.emails.send({
    from:    fromEmail,
    to:      args.toEmail,
    subject: "Reset your password",
    html:    renderResetHtml(args),
    text:    renderResetText(args),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML / text renderers
// ─────────────────────────────────────────────────────────────────────────────

function renderResetHtml(args: { toName?: string; resetLink: string; expiresInMinutes: number }): string {
  const greeting = args.toName ? `Hi ${escapeHtml(args.toName)},` : "Hi there,";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Reset your password</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;color:#111;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#fff;border-radius:8px;padding:32px;max-width:560px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111;">Reset your password</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#333;">${greeting}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#333;">
            Someone (hopefully you) requested a password reset. Click the button below to choose a new password.
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${escapeAttr(args.resetLink)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
              Reset password
            </a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#666;">
            Or copy this link into your browser:<br />
            <a href="${escapeAttr(args.resetLink)}" style="color:#111;word-break:break-all;">${escapeHtml(args.resetLink)}</a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#666;">
            This link expires in ${args.expiresInMinutes} minutes and can only be used once.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:13px;line-height:1.5;color:#888;">
            Didn't request this? You can safely ignore this email — your password won't change unless you click the link above and choose a new one.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function renderResetText(args: { toName?: string; resetLink: string; expiresInMinutes: number }): string {
  const greeting = args.toName ? `Hi ${args.toName},` : "Hi there,";
  return `
${greeting}

Someone (hopefully you) requested a password reset. Click the link below to choose a new password:

${args.resetLink}

This link expires in ${args.expiresInMinutes} minutes and can only be used once.

Didn't request this? You can safely ignore this email — your password won't change unless you click the link above and choose a new one.
`.trim();
}

function renderInviteHtml(args: {
  toName?:       string;
  inviteLink:    string;
  expiresInDays: number;
  invitedBy?:    string;
}): string {
  const greeting = args.toName ? `Hi ${escapeHtml(args.toName)},` : "Hi there,";
  const inviter  = args.invitedBy ? escapeHtml(args.invitedBy) : "Someone";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>You've been invited</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;color:#111;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#fff;border-radius:8px;padding:32px;max-width:560px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111;">You've been invited</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#333;">${greeting}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#333;">
            ${inviter} invited you to join. Click the button below to set up your password and sign in.
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${escapeAttr(args.inviteLink)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
              Set up your account
            </a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#666;">
            Or copy this link into your browser:<br />
            <a href="${escapeAttr(args.inviteLink)}" style="color:#111;word-break:break-all;">${escapeHtml(args.inviteLink)}</a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#666;">
            This invite expires in ${args.expiresInDays} day${args.expiresInDays === 1 ? "" : "s"} and can only be used once.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="margin:0;font-size:13px;line-height:1.5;color:#888;">
            Not expecting this? You can ignore this email — no account will be activated unless you click the link and set a password.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function renderInviteText(args: {
  toName?:       string;
  inviteLink:    string;
  expiresInDays: number;
  invitedBy?:    string;
}): string {
  const greeting = args.toName ? `Hi ${args.toName},` : "Hi there,";
  const inviter  = args.invitedBy ?? "Someone";
  return `
${greeting}

${inviter} invited you to join. Click the link below to set up your password and sign in:

${args.inviteLink}

This invite expires in ${args.expiresInDays} day${args.expiresInDays === 1 ? "" : "s"} and can only be used once.

Not expecting this? You can ignore this email — no account will be activated unless you click the link and set a password.
`.trim();
}

function renderVerifyHtml(data: { name?: string; link: string }): string {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hi there,";
  return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;color:#111;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;">
    <h1 style="margin:0 0 16px;font-size:20px;">Verify your email</h1>
    <p style="margin:0 0 16px;line-height:1.5;">${greeting}</p>
    <p style="margin:0 0 24px;line-height:1.5;">Click the button below to verify your email address.</p>
    <p style="text-align:center;">
      <a href="${escapeAttr(data.link)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Verify email</a>
    </p>
  </div>
</body></html>`.trim();
}

function renderVerifyText(data: { name?: string; link: string }): string {
  const greeting = data.name ? `Hi ${data.name},` : "Hi there,";
  return `${greeting}\n\nVerify your email by clicking the link below:\n\n${data.link}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
