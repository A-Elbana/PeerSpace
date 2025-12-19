import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import prisma from "./config/prisma";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import communityRoutes from "./routes/communityRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import submissionRoutes from "./routes/submissionRoutes";
import noteRoutes from "./routes/noteRoutes";
import notebookRoutes from "./routes/notebookRoutes";
import taskRoutes from "./routes/taskRoutes";
import taskAssigneeRoutes from "./routes/taskAssigneeRoutes";
import badgeRoutes from "./routes/badgeRoutes";
import voteRoutes from "./routes/voteRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import fileRoutes from "./routes/fileRoutes";
import adminRoutes from "./routes/adminRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import notificationsRoutes from "./routes/notificationsRoutes";
import instructorRoutes from "./routes/instructorRoutes";
import studentRoutes from "./routes/studentRoutes";
import { getCorsConfig } from "./config/corsConfig";
import { generalLimiter } from "./middleware/rateLimitMiddleware";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";

dotenv.config();

import http from "http";
import { initSocket } from "./services/socket";
import { startNotificationBroadcaster } from "./services/notificationBroadcaster";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Health check - At the very top for debugging
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
    version: "1.0.1"
  });
});

// Create HTTP server so Socket.io can attach
const server = http.createServer(app);

const cors = require("cors");
const corsMiddleware = cors(getCorsConfig());

// Middlewares
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Response] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  console.log(`[Request] ${req.method} ${req.url}`);
  corsMiddleware(req, res, next);
});

// 2. Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 3. General rate limiting
// app.use(generalLimiter);

// 4. Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 5. Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/notebooks", notebookRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/task-assignees", taskAssigneeRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/student", studentRoutes);

// 6. 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// 7. Global error handler (MUST be last middleware)
app.use(errorHandler);

// Start server
// Initialize socket.io and start the notification broadcaster
const io = initSocket(server);
startNotificationBroadcaster(io).catch((err) =>
  console.error("Notification broadcaster failed:", err)
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
