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
import voteRoutes from "./routes/voteRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import fileRoutes from "./routes/fileRoutes";
import { getCorsConfig } from "./config/corsConfig";
import { generalLimiter } from "./middleware/rateLimitMiddleware";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Order matters!
// 1. CORS configuration
app.use((req: Request, res: Response, next: NextFunction) => {
  const corsMiddleware = require("cors")(getCorsConfig());
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
app.use("/api/votes", voteRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/files", fileRoutes);

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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
