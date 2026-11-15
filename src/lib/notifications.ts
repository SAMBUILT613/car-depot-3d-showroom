import { prisma } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  email?: string | null;
  href?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 2000),
      data: input.data ? JSON.parse(JSON.stringify(input.data)) : undefined,
    },
  });

  if (input.email) {
    const delivery = await prisma.notificationDelivery.create({
      data: { notificationId: notification.id, channel: "EMAIL", status: "QUEUED" },
    });
    const result = await sendNotificationEmail({
      email: input.email,
      subject: input.title,
      title: input.title,
      body: input.body,
      href: input.href,
    });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: result.sent ? "SENT" : result.reason === "EMAIL_PROVIDER_NOT_CONFIGURED" || result.reason === "APP_URL_NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAILED",
        providerId: result.providerId,
        attempts: 1,
        sentAt: result.sent ? new Date() : null,
        lastError: result.reason ?? null,
      },
    });
  }

  return notification;
}

export async function notifyActiveAdministrators(input: {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  href?: string;
}) {
  const administrators = await prisma.adminUser.findMany({
    where: { status: "ACTIVE", removedAt: null, suspendedAt: null, user: { status: "ACTIVE" } },
    select: { userId: true, user: { select: { email: true } } },
  });
  for (const administrator of administrators) {
    await createNotification({
      userId: administrator.userId,
      email: administrator.user.email,
      ...input,
    });
  }
}
