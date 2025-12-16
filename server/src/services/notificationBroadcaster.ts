import prisma from "../config/prisma";
import { Server as IOServer } from "socket.io";

/**
 * Poll the database for new notifications and emit a lightweight signal
 * to connected clients. Clients should then refetch full notification data
 * using the existing HTTP API (Signal & Refetch pattern).
 */
export async function startNotificationBroadcaster(io: IOServer) {
  let lastCheck = new Date(0); // epoch

  const emitted = new Map<number, number>(); // userNotificationId -> timestamp
  const baseInterval = 2000;
  const maxInterval = 60000;
  let intervalMs = baseInterval;
  let consecutiveErrors = 0;

  const pollOnce = async () => {
    try {
      const recent = await prisma.userNotification.findMany({
        where: {
          Notification: {
            createdAt: { gt: lastCheck },
          },
        },
        include: {
          Notification: true,
        },
      });

      if (recent.length > 0) {
        // Advance lastCheck to newest createdAt seen to avoid duplicates
        const maxDate = recent.reduce((acc, cur) => {
          const d = cur.Notification.createdAt;
          return d > acc ? d : acc;
        }, lastCheck);
        lastCheck = maxDate;

        for (const un of recent) {
          // Dedupe by userNotification id
          if (emitted.has(un.id)) continue;

          const room = `user:${un.recipientId}`;
          const payload = {
            userNotificationId: un.id,
            notificationContent: {
              id: un.notificationId,
              message: un.Notification.message,
              type: un.Notification.type,
              resourceId: un.Notification.resourceId,
              createdAt: un.Notification.createdAt,
            },
          };

          // Emit to the user's room. Clients subscribe to `user:{id}`.
          io.to(room).emit("notifications:signal", payload);
          emitted.set(un.id, Date.now());
        }
      }

      // Success: reset backoff
      consecutiveErrors = 0;
      intervalMs = baseInterval;
    } catch (err) {
      consecutiveErrors += 1;
      intervalMs = Math.min(maxInterval, baseInterval * Math.pow(2, consecutiveErrors));
      console.error("Error polling notifications:", err, "— increasing interval to", intervalMs);
    } finally {
      // Prune emitted map entries older than 10 minutes
      const cutoff = Date.now() - 10 * 60 * 1000;
      for (const [id, ts] of emitted.entries()) {
        if (ts < cutoff) emitted.delete(id);
      }

      // Schedule next poll
      setTimeout(pollOnce, intervalMs);
    }
  };

  // Run immediately once
  await pollOnce();
}
