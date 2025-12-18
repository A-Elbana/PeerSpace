import { Request, Response } from "express";
import StudentService from "../services/StudentService";

export const getStudentDashboard = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const data = await StudentService.getDashboardData(userId);
    return res.status(200).json({ data });
  } catch (err) {
    console.error("Get Student Dashboard Error:", err);
    return res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

export const exploreFeed = async (req: Request, res: Response) => {
  const userId = (req as any).userId || null;
  const params = req.query;

  try {
    const result = await StudentService.exploreFeed(params as any, userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Explore Feed Error:", err);
    return res.status(500).json({ message: "Failed to fetch explore feed" });
  }
};
