export type NotificationChannel = "in_app" | "email" | "whatsapp";

export type NotificationProviderPayload = {
  channel: NotificationChannel;
  id: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  title: string;
  body: string;
};

export type NotificationProviderResult = {
  ok: boolean;
  provider: string;
  providerMessageId?: string;
  failureReason?: string;
};
