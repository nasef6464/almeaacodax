# WhatsApp Integration Guide

## Current Status

The platform now stores WhatsApp notification delivery records, but it does not call a real WhatsApp provider until credentials and provider choice are configured.

## Recommended Providers

- WhatsApp Business Cloud API.
- Twilio WhatsApp.
- A trusted local/Saudi provider with official WhatsApp Business support.

## Required Production Values

Typical WhatsApp Cloud API values:

```text
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
```

Twilio-style values:

```text
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+...
```

Do not commit these values to Git.

## Current Test Mode

For local/staging smoke testing only:

```text
WHATSAPP_PROVIDER=console
```

This marks pending WhatsApp deliveries as sent and logs a safe JSON line without contacting WhatsApp.

## Production Notes

- WhatsApp template messages must be approved by the provider before use.
- OTP and marketing announcements should have separate templates and rate limits.
- Bulk WhatsApp campaigns should run through a queue, not direct HTTP requests.
- Delivery status webhooks should update `NotificationDelivery` records when the provider sends delivery/read/failure events.
