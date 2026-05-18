# email — Resend Transactional Email

Lightweight wrapper around [Resend](https://resend.com). Sends raw HTML +
plaintext (no Resend templates), so the email package owns its own
copy and you can develop reset flows with no provisioned account.

## Functions

### `sendPasswordResetEmail(args)` — TT-118

Sends a password-reset email with a styled button + plaintext fallback.

```typescript
import { sendPasswordResetEmail } from "email";

await sendPasswordResetEmail({
  toEmail:          "user@example.com",
  toName:           "Jane",            // optional
  resetLink:        "https://app.example.com/reset-password?token=...",
  expiresInMinutes: 60,
  fromEmail:        "noreply@example.com",  // optional, defaults to RESEND_FROM_EMAIL
});
```

### `sendEmailVerificationMail(fromEmail, toEmail, data)`

Kept for backward compat with `apps/worker`. Same Resend send, raw HTML.

```typescript
import { sendEmailVerificationMail } from "email";

await sendEmailVerificationMail(
  "noreply@example.com",
  "user@example.com",
  { name: "Jane", link: "https://app.example.com/verify?token=..." },
);
```

## Environment Variables

| Var | When required | Notes |
|-----|---------------|-------|
| `RESEND_API_KEY` | Always in prod | Get one at resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Recommended | Verified sender. **Bare email — no quotes** (Vercel stores quotes literally and Resend rejects). Defaults to `noreply@example.com`. |

## Dev Mode Fallback

When `NODE_ENV === "development"` AND `RESEND_API_KEY` is unset, every
send function logs the email to the console instead of calling Resend.
You can develop the password-reset flow end-to-end without provisioning
anything; just copy the URL out of the dev-server log.

In any non-dev environment, missing `RESEND_API_KEY` throws. Fail loud
so we never silently drop transactional email in prod.

## Why no Resend templates

Resend templates are per-environment objects (separate dev / prod IDs),
which means new env vars and new clones-of-clones every time you copy
this template. Raw HTML in code is checked-in, easy to diff, easy to
preview. The tradeoff is that visual changes need a code commit — which
is the right tradeoff for transactional mail.

## Build

```bash
pnpm build -F email
```

`packages/email/tsconfig.json` compiles to CommonJS for Docker / Node use.
The dashboard's build pipeline runs this `tsc` step explicitly so the
worker and Next apps both have the compiled `dist/`.
