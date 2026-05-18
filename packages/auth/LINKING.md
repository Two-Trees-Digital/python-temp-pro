# Account linking policy

How `packages/auth` handles same-email collisions when an OAuth user (Google, GitHub) signs in and a User row already exists for that email.

## Rule

> **Auto-link if the OAuth provider returned a verified email. Block + redirect to `/login?error=verify_email_first` otherwise.**

## How it works

When `signIn` callback fires with an OAuth account:

1. **No collision** — no User exists with this email → return `true`, let the adapter create User + Account.
2. **Collision + verified email** — link the OAuth Account row to the existing User (idempotent), stamp `User.authProvider`, return `true`.
3. **Collision + unverified email** — return `"/login?error=verify_email_first"`.

## Per-provider verification

| Provider | How "verified" is determined |
|---|---|
| Google | `profile.email_verified === true` (boolean field in the OIDC ID token) |
| GitHub | Always treated as verified — GitHub's OAuth flow returns the user's PRIMARY email, which they had to verify in account settings to set as primary |

Unknown providers fall through to `false` (block by default).
