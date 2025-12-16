import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const page = parseInt((req.query.page as string) || "1", 10);
  const pageSize = parseInt((req.query.pageSize as string) || "50", 10);

  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: userId, isRead: false },
  });

  res.json({ success: true, data: notifications, unreadCount });
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const unreadCount = await prisma.notification.count({
    where: { recipientId: userId, isRead: false },
  });
  res.json({ success: true, unreadCount });
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  // `validateIdParam` middleware attaches a parsed numeric id to req when used.
  const id = (req as any).id ?? parseInt(String(req.params.id ?? ""), 10);

  const updated = await prisma.notification.updateMany({
    where: { id, recipientId: userId },
    data: { isRead: true },
  });

  res.json({ success: true, updated: updated.count });
};

export const markAllRead = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const updated = await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true, updated: updated.count });
};
