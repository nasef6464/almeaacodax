# Auth Account Security

## Current Status

This sprint closes the first production account-recovery foundation.

Implemented:

- Registration creates an email verification token.
- Verification tokens are stored as SHA-256 hashes, not plain text.
- Password reset tokens are stored as SHA-256 hashes, not plain text.
- Forgot-password responses are generic to reduce account enumeration.
- Reset tokens expire after 60 minutes and are cleared after use.
- Email verification tokens expire after 24 hours.
- Verification and reset messages are queued through the notification delivery system.
- No email provider secret is committed to Git.

## API Endpoints

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/email/verify`
- `POST /api/auth/email/resend-verification`

## Provider Behavior

The backend queues email delivery records. Real email delivery depends on configuring an email provider adapter later.

For staging-only testing:

```text
EMAIL_PROVIDER=console
```

For production, connect Resend, SendGrid, Mailgun, Amazon SES, or another provider before relying on email delivery.

## Remaining Work

- Add real email provider adapter.
- Add frontend screens for forgot/reset/verify flows if not already present in design.
- Add optional Google OAuth after provider credentials are ready.
- Move sessions to HttpOnly Secure SameSite cookies in a later auth-hardening sprint.
