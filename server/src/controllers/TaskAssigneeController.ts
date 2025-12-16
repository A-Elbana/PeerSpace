import { Request, Response } from "express";
import prisma from "../config/prisma";
import { hasCommonCommunity } from "../utils/helpers";
import ActivityLogService from "../services/ActivityLogService";

/**
 * Invite a student to be a task assignee
 * Middleware: authenticateToken
 * Note: Only the task owner (student who created the task) can invite
 * Validates that inviter and invitee have at least one common community
 */
export const inviteTaskAssignee = async (req: Request, res: Response) => {
  const { taskId, invitedStudentId } = req.body;
  const inviterId = (req as any).userId;

  // Validation
  if (!taskId || !invitedStudentId) {
    return res
      .status(400)
      .json({ message: "Task ID and invited student ID are required" });
  }

  // Validate taskId and invitedStudentId are numbers
  if (typeof taskId !== "number" || !Number.isInteger(taskId)) {
    return res.status(400).json({ message: "Task ID must be a valid integer" });
  }

  if (
    typeof invitedStudentId !== "number" ||
    !Number.isInteger(invitedStudentId)
  ) {
    return res
      .status(400)
      .json({ message: "Invited student ID must be a valid integer" });
  }

  if (invitedStudentId === inviterId) {
    return res
      .status(400)
      .json({ message: "Cannot invite yourself to a task" });
  }

  try {
    // Check if invited user exists and is a student
    const invitedUser = await prisma.user.findUnique({
      where: { id: invitedStudentId },
      select: { id: true, role: true },
    });

    if (!invitedUser) {
      return res.status(404).json({ message: "Invited user not found" });
    }

    if (invitedUser.role !== "STUDENT") {
      return res.status(400).json({
        message: "Only students can be invited to tasks",
      });
    }

    // Check if invited user has a Student record
    const invitedStudent = await prisma.student.findUnique({
      where: { uid: invitedStudentId },
    });

    if (!invitedStudent) {
      return res.status(400).json({
        message:
          "Invited user does not have a student profile. Please ensure the user is registered as a student.",
      });
    }

    // Check if task exists and is owned by the inviter
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { author: true },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.author !== inviterId) {
      return res
        .status(403)
        .json({ message: "Only the task owner can invite assignees" });
    }

    // Check if both students have at least one common community
    const hasCommon = await hasCommonCommunity(inviterId, invitedStudentId);

    if (!hasCommon) {
      return res.status(400).json({
        message:
          "Inviter and invitee must have at least one common community",
      });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.taskAssignees.findUnique({
      where: {
        tid_sid: {
          tid: taskId,
          sid: invitedStudentId,
        },
      },
    });

    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "This student is already invited for this task" });
    }

    // Create task assignee with isAccepted = false
    const taskAssignee = await prisma.taskAssignees.create({
      data: {
        tid: taskId,
        sid: invitedStudentId,
        isAccepted: false,
      },
    });

    // Fetch the created record with proper includes
    const taskAssigneeWithRelations = await prisma.taskAssignees.findUnique({
      where: {
        tid_sid: {
          tid: taskAssignee.tid,
          sid: taskAssignee.sid,
        },
      },
      include: {
        Student: {
          select: {
            uid: true,
            User: {
              select: {
                fname: true,
                lname: true,
                email: true,
              },
            },
          },
        },
        Task: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
      },
    });

    // Log the activity
    await ActivityLogService.logTaskAssigneeInvited(
      inviterId,
      (undefined as unknown) as string | undefined,
      `Invited ${taskAssigneeWithRelations?.Student?.User?.fname || "user"} to task "${taskAssigneeWithRelations?.Task?.title || "task"}"`
    );

    res.status(201).json({
      message: "Student invited successfully",
      data: taskAssigneeWithRelations,
    });
  } catch (error) {
    console.error("Invite Task Assignee Error:", error);
    res.status(500).json({ message: "Failed to invite task assignee" });
  }
};

/**
 * Accept a task assignee invitation
 * Middleware: authenticateToken
 * Note: Only the invited student can accept their own invitation
 */
export const acceptTaskAssignee = async (req: Request, res: Response) => {
  const { taskId } = req.body;
  const studentId = (req as any).userId;

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  try {
    // Check if the assignment exists and belongs to the authenticated user
    const taskAssignee = await prisma.taskAssignees.findUnique({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
    });

    if (!taskAssignee) {
      return res.status(404).json({
        message: "Task assignment not found for this user",
      });
    }

    if (taskAssignee.isAccepted) {
      return res.status(400).json({
        message: "This invitation has already been accepted",
      });
    }

    // Update isAccepted to true
    const updatedAssignee = await prisma.taskAssignees.update({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
      data: {
        isAccepted: true,
      },
      include: {
        Student: {
          select: {
            uid: true,
            User: {
              select: {
                fname: true,
                lname: true,
                email: true,
              },
            },
          },
        },
        Task: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
      },
    });

    // Log the activity
    await ActivityLogService.logTaskAssigneeAccepted(
      studentId,
      (undefined as unknown) as string | undefined,
      `Accepted invitation to task "${updatedAssignee?.Task?.title || "task"}"`
    );

    res.status(200).json({
      message: "Invitation accepted successfully",
      data: updatedAssignee,
    });
  } catch (error) {
    console.error("Accept Task Assignee Error:", error);
    res.status(500).json({ message: "Failed to accept task assignment" });
  }
};

/**
 * Get all assignees for a task
 * Middleware: optionalAuthenticateToken
 * Returns all invited students (accepted and pending)
 */
export const getTaskAssignees = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  try {
    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const assignees = await prisma.taskAssignees.findMany({
      where: { tid: parseInt(taskId) },
      skip,
      take: limit,
      include: {
        Student: {
          select: {
            uid: true,
            User: {
              select: {
                fname: true,
                lname: true,
                email: true,
                avatar_file_id: true,
              },
            },
          },
        },
      },
      orderBy: { isAccepted: "desc" }, // Accepted first
    });

    const total = await prisma.taskAssignees.count({
      where: { tid: parseInt(taskId) },
    });

    res.status(200).json({
      data: assignees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Task Assignees Error:", error);
    res.status(500).json({ message: "Failed to fetch task assignees" });
  }
};

/**
 * Get pending invitations for a student
 * Middleware: authenticateToken
 * Returns all pending task invitations for the authenticated student
 */
export const getPendingTaskInvitations = async (
  req: Request,
  res: Response
) => {
  const studentId = (req as any).userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;

  try {
    const invitations = await prisma.taskAssignees.findMany({
      where: {
        sid: studentId,
        isAccepted: false,
      },
      skip,
      take: limit,
      include: {
        Task: {
          select: {
            id: true,
            title: true,
            description: true,
            start_date: true,
            end_date: true,
            priority: true,
            author: true,
            Student: {
              select: {
                User: {
                  select: {
                    fname: true,
                    lname: true,
                    email: true,
                    avatar_file_id: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { Task: { end_date: "asc" } },
    });

    const total = await prisma.taskAssignees.count({
      where: {
        sid: studentId,
        isAccepted: false,
      },
    });

    res.status(200).json({
      data: invitations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Pending Invitations Error:", error);
    res.status(500).json({ message: "Failed to fetch pending invitations" });
  }
};

/**
 * Remove a task assignee
 * Middleware: authenticateToken
 * Note: Only the task owner can remove assignees
 */
export const removeTaskAssignee = async (req: Request, res: Response) => {
  const { taskId, studentId } = req.body;
  const ownerId = (req as any).userId;

  if (!taskId || !studentId) {
    return res
      .status(400)
      .json({ message: "Task ID and student ID are required" });
  }

  try {
    // Check if task exists and is owned by the requester
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { author: true },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Allow removal if requester is the task owner OR the assignee themselves
    if (task.author !== ownerId && ownerId !== studentId) {
      return res
        .status(403)
        .json({ message: "Only the task owner can remove other assignees" });
    }

    // Check if assignment exists
    const assignment = await prisma.taskAssignees.findUnique({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
      include: {
        Student: {
          select: {
            User: {
              select: {
                fname: true,
              },
            },
          },
        },
        Task: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Task assignment not found",
      });
    }

    // Delete the assignment
    await prisma.taskAssignees.delete({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
    });

    // Log the activity
    await ActivityLogService.logTaskAssigneeRemoved(
      ownerId,
      (undefined as unknown) as string | undefined,
      `Removed ${assignment?.Student?.User?.fname || "user"} from task "${assignment?.Task?.title || "task"}"`
    );

    res.status(200).json({
      message: "Task assignee removed successfully",
    });
  } catch (error) {
    console.error("Remove Task Assignee Error:", error);
    res.status(500).json({ message: "Failed to remove task assignee" });
  }
};

/**
 * Decline a task assignee invitation
 * Middleware: authenticateToken
 * Note: Only the invited student can decline their own invitation
 */
export const declineTaskAssignee = async (req: Request, res: Response) => {
  const { taskId } = req.body;
  const studentId = (req as any).userId;

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  try {
    // Check if the assignment exists and belongs to the authenticated user
    const taskAssignee = await prisma.taskAssignees.findUnique({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
      include: {
        Task: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!taskAssignee) {
      return res.status(404).json({
        message: "Task assignment not found for this user",
      });
    }

    // Delete the assignment
    await prisma.taskAssignees.delete({
      where: {
        tid_sid: {
          tid: taskId,
          sid: studentId,
        },
      },
    });

    // Log the activity
    await ActivityLogService.logTaskAssigneeDeclined(
      studentId,
      undefined,
      `Declined invitation to task "${taskAssignee?.Task?.title || "task"}"`
    );

    res.status(200).json({
      message: "Task invitation declined successfully",
    });
  } catch (error) {
    console.error("Decline Task Assignee Error:", error);
    res.status(500).json({ message: "Failed to decline task assignment" });
  }
};
