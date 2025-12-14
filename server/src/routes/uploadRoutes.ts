import express from "express";
import { signDirectUpload } from "../controllers/UploadController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  validateUploadSign,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = express.Router();

// Sign parameters for direct client upload to Cloudinary
router.post(
  "/sign",
  authenticateToken,
  validateUploadSign,
  handleValidationErrors,
  signDirectUpload
);

export default router;
