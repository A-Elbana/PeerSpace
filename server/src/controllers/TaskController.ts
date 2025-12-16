import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with task data
 */
interface TaskRequest extends Request {
  task?: any;
}

/**
 * Task status constants
 */
export const TaskStatus = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  ON_HOLD: 3,
  CANCELLED: 4,
};

/**
 * Check if setting parentTaskId as parent of taskId would create a cycle
 * by traversing up the parent chain from parentTaskId
 */
const detectCycle = async (taskId: number, parentTaskId: number): Promise<boolean> => {
  let currentId: number | null = parentTaskId;
  const visited = new Set<number>();

  while (currentId !== null) {
    // Cycle detected
    if (currentId === taskId) {
      return true;
    }

    // Prevent infinite loop in case of existing cycles in DB
    if (visited.has(currentId)) {
      return false;
    }

    visited.add(currentId);

    // Get the parent of current task
    type TaskParent = { parent_task: number | null };
    const currentTaskData: TaskParent | null = await prisma.task.findUnique({
      where: { id: currentId },
      select: { parent_task: true },
    });

    if (!currentTaskData) {
      return false;
    }

    currentId = currentTaskData.parent_task;
  }

  return false;
};

/**
 * Create a new task.
 * Expects: title, status, description (optional), priority (optional), 
 *          start_date (optional), end_date (optional), parent_task (optional), 
 *          assignment_id (optional - to link to an assignment)
 * author is taken from the authenticated user's token (req.userId)
 * Requires: authenticateToken + requireStudentRole + validateTaskCreate middleware
 */
export const createTask = async (req: Request, res: Response) => {
  const { title, description, priority, start_date, end_date, status, parent_task, assignment_id } = req.body;
  const author = (req as any).userId;

  try {
    // If parent_task is provided, verify it exists and belongs to the user
    if (parent_task) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parseInt(parent_task) },
      });

      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      if (parentTask.author !== author) {
        return res.status(403).json({ message: "You can only create subtasks for your own tasks" });
      }

      // Check for cycles - no cycle detection needed for new task, but verify parent is valid
      // (new tasks can't create cycles since they don't exist yet)
    }

    // If assignment_id is provided, verify the student is enrolled in that assignment's community
    if (assignment_id) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(assignment_id) },
        include: { Community: true },
      });

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          cid_sid: {
            cid: assignment.cid,
            sid: author,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in the assignment's community" });
      }
    }

    // Create task with optional assignment relation
    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          priority: priority !== undefined ? parseInt(priority) : null,
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          status: parseInt(status),
          author: author,
          parent_task: parent_task ? parseInt(parent_task) : null,
        },
        include: {
          Student: {
            include: {
              User: {
                select: { id: true, fname: true, lname: true },
              },
            },
          },
          Task: {
            select: { id: true, title: true },
          },
        },
      });

      // If assignment_id is provided, create the relation
      if (assignment_id) {
        await tx.taskAssignmentRelation.create({
          data: {
            tid: newTask.id,
            aid: parseInt(assignment_id),
          },
        });
      }

      return newTask;
    });

    // Fetch the complete task with assignment relation if created
    const completeTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        Student: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
        Task: {
          select: { id: true, title: true },
        },
        TaskAssignmentRelation: {
          include: {
            Assignment: {
              select: { id: true, title: true, due_date: true },
            },
          },
        },
        TaskTag: true,
        _count: {
          select: { other_Task: true, TaskAssignees: true },
        },
      },
    });

    return res.status(201).json(completeTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    return res.status(500).json({ message: "Failed to create task" });
  }
};

/**
 * Get all tasks for the authenticated user with pagination and filters.
 * Expects: page (optional), limit (optional), status (optional), priority (optional)
 * Requires: authenticateToken + requireStudentRole middleware
 */
export const getMyTasks = async (req: Request, res: Response) => {
  const author = (req as any).userId;

  // Pagination
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  // Filters
  const statusParam = req.query.status as string;
  const priorityParam = req.query.priority as string;
  const parentOnly = req.query.parent_only === "true"; // Only top-level tasks

  // Build base filters
  const baseFilters: any = {};
  if (statusParam !== undefined && !isNaN(parseInt(statusParam))) {
    baseFilters.status = parseInt(statusParam);
  }

  if (priorityParam !== undefined && !isNaN(parseInt(priorityParam))) {
    baseFilters.priority = parseInt(priorityParam);
  }

  if (parentOnly) {
    baseFilters.parent_task = null;
  }

  // Include tasks where user is the author OR where the user is an assignee
  const whereClause: any = {
    OR: [
      { author: author, ...baseFilters },
      { TaskAssignees: { some: { sid: author, isAccepted: true } }, ...baseFilters },
    ],
  };

  try {
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { status: "asc" },
          { end_date: "asc" },
          { priority: "desc" },
        ],
        include: {
          Task: {
            select: { id: true, title: true },
          },
          TaskAssignmentRelation: {
            include: {
              Assignment: {
                select: { id: true, title: true, due_date: true },
              },
            },
          },
          TaskTag: true,
          TaskAssignees: {
            include: {
              Student: {
                include: {
                  User: {
                    select: { id: true, fname: true, lname: true },
                  },
                },
              },
            },
          },
          _count: {
            select: { other_Task: true, TaskAssignees: true },
          },
        },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get My Tasks Error:", error);
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

/**
 * Get a single task by ID.
 * Expects: id (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 * req.task is set by loadTask middleware
 */
export const getTaskById = async (req: TaskRequest, res: Response) => {
  // Task already loaded and access authorized by middleware
  return res.status(200).json(req.task);
};

/**
 * Get subtasks of a task.
 * Expects: id (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const getSubtasks = async (req: TaskRequest, res: Response) => {
  const task = req.task;

  try {
    const subtasks = await prisma.task.findMany({
      where: { parent_task: task.id },
      orderBy: [{ status: "asc" }, { end_date: "asc" }],
      include: {
        TaskTag: true,
        _count: {
          select: { other_Task: true },
        },
      },
    });

    return res.status(200).json(subtasks);
  } catch (error) {
    console.error("Get Subtasks Error:", error);
    return res.status(500).json({ message: "Failed to fetch subtasks" });
  }
};

/**
 * Update a task.
 * Expects: id (path param), title (optional), description (optional), priority (optional),
 *          start_date (optional), end_date (optional), status (optional), parent_task (optional)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 * req.task is set by loadTask middleware
 */
export const updateTask = async (req: TaskRequest, res: Response) => {
  const task = req.task;
  const author = (req as any).userId;
  const { title, description, priority, start_date, end_date, status, parent_task } = req.body;

  const updateData: {
    title?: string;
    description?: string | null;
    priority?: number | null;
    start_date?: Date | null;
    end_date?: Date | null;
    status?: number;
    parent_task?: number | null;
  } = {};

  if (title !== undefined) {
    updateData.title = String(title).trim();
  }

  if (description !== undefined) {
    updateData.description = description !== null ? String(description).trim() : null;
  }

  if (priority !== undefined) {
    updateData.priority = priority !== null ? parseInt(priority) : null;
  }

  if (start_date !== undefined) {
    updateData.start_date = start_date ? new Date(start_date) : null;
  }

  if (end_date !== undefined) {
    updateData.end_date = end_date ? new Date(end_date) : null;
  }

  if (status !== undefined) {
    updateData.status = parseInt(status);
  }

  if (parent_task !== undefined) {
    if (parent_task === null) {
      updateData.parent_task = null;
    } else {
      // Verify parent task exists and belongs to user
      const parentTaskRecord = await prisma.task.findUnique({
        where: { id: parseInt(parent_task) },
      });

      if (!parentTaskRecord) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      if (parentTaskRecord.author !== author) {
        return res.status(403).json({ message: "You can only set parent to your own tasks" });
      }

      // Prevent circular reference - direct self-reference
      if (parentTaskRecord.id === task.id) {
        return res.status(400).json({ message: "A task cannot be its own parent" });
      }

      // Check for cycles (e.g., t1 parent of t2, t2 parent of t3, t3 parent of t1)
      const hasCycle = await detectCycle(task.id, parseInt(parent_task));
      if (hasCycle) {
        return res.status(400).json({ message: "Circular parent relationship would be created" });
      }

      updateData.parent_task = parseInt(parent_task);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: updateData,
      include: {
        Student: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
        Task: {
          select: { id: true, title: true },
        },
        TaskAssignmentRelation: {
          include: {
            Assignment: {
              select: { id: true, title: true, due_date: true },
            },
          },
        },
        TaskTag: true,
        _count: {
          select: { other_Task: true, TaskAssignees: true },
        },
      },
    });

    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update Task Error:", error);
    return res.status(500).json({ message: "Failed to update task" });
  }
};

/**
 * Update task status (quick status change).
 * Expects: id (path param), status (body)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const updateTaskStatus = async (req: TaskRequest, res: Response) => {
  const task = req.task;
  const { status } = req.body;

  if (status === undefined) {
    return res.status(400).json({ message: "Status is required" });
  }

  const statusValue = parseInt(status);
  if (isNaN(statusValue) || statusValue < 0 || statusValue > 4) {
    return res.status(400).json({ message: "Invalid status value (0-4)" });
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { status: statusValue },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return res.status(200).json({
      message: "Task status updated",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update Task Status Error:", error);
    return res.status(500).json({ message: "Failed to update task status" });
  }
};

/**
 * Delete a task.
 * Expects: id (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 * req.task is set by loadTask middleware
 * Note: Deleting a task will also delete subtasks (cascade)
 */
export const deleteTask = async (req: TaskRequest, res: Response) => {
  const task = req.task;

  try {
    // Cascade will handle subtasks, tags, assignees, and assignment relation
    await prisma.task.delete({
      where: { id: task.id },
    });

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    return res.status(500).json({ message: "Failed to delete task" });
  }
};

/**
 * Add a tag to a task.
 * Expects: id (path param), tag (body)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const addTaskTag = async (req: TaskRequest, res: Response) => {
  const task = req.task;
  const { tag } = req.body;

  if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
    return res.status(400).json({ message: "Tag is required" });
  }

  const tagValue = tag.trim().toLowerCase();

  try {
    // Check if tag already exists
    const existingTag = await prisma.taskTag.findUnique({
      where: {
        task_id_tag: {
          task_id: task.id,
          tag: tagValue,
        },
      },
    });

    if (existingTag) {
      return res.status(409).json({ message: "Tag already exists on this task" });
    }

    await prisma.taskTag.create({
      data: {
        task_id: task.id,
        tag: tagValue,
      },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: { TaskTag: true },
    });

    return res.status(201).json({
      message: "Tag added successfully",
      tags: updatedTask?.TaskTag,
    });
  } catch (error) {
    console.error("Add Task Tag Error:", error);
    return res.status(500).json({ message: "Failed to add tag" });
  }
};

/**
 * Remove a tag from a task.
 * Expects: id (path param), tag (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const removeTaskTag = async (req: TaskRequest, res: Response) => {
  const task = req.task;
  const tag = req.params.tag;

  if (!tag) {
    return res.status(400).json({ message: "Tag is required" });
  }

  try {
    await prisma.taskTag.delete({
      where: {
        task_id_tag: {
          task_id: task.id,
          tag: tag,
        },
      },
    });

    return res.status(200).json({ message: "Tag removed successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Tag not found on this task" });
    }
    console.error("Remove Task Tag Error:", error);
    return res.status(500).json({ message: "Failed to remove tag" });
  }
};

/**
 * Get all tags for a task.
 * Expects: id (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const getTaskTags = async (req: TaskRequest, res: Response) => {
  const task = req.task;

  try {
    const tags = await prisma.taskTag.findMany({
      where: { task_id: task.id },
      orderBy: { tag: "asc" },
    });

    return res.status(200).json({
      message: "Tags retrieved successfully",
      data: tags,
    });
  } catch (error) {
    console.error("Get Task Tags Error:", error);
    return res.status(500).json({ message: "Failed to fetch task tags" });
  }
};

/**
 * Link a task to an assignment.
 * Expects: id (path param), assignment_id (body)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const linkTaskToAssignment = async (req: TaskRequest, res: Response) => {
  const task = req.task;
  const author = (req as any).userId;
  const { assignment_id } = req.body;

  if (!assignment_id) {
    return res.status(400).json({ message: "Assignment ID is required" });
  }

  try {
    // Verify assignment exists and student is enrolled
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(assignment_id) },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: assignment.cid,
          sid: author,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You must be enrolled in the assignment's community" });
    }

    // Create or update the relation
    await prisma.taskAssignmentRelation.upsert({
      where: { tid: task.id },
      create: {
        tid: task.id,
        aid: parseInt(assignment_id),
      },
      update: {
        aid: parseInt(assignment_id),
      },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        TaskAssignmentRelation: {
          include: {
            Assignment: {
              select: { id: true, title: true, due_date: true },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Task linked to assignment successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Link Task to Assignment Error:", error);
    return res.status(500).json({ message: "Failed to link task to assignment" });
  }
};

/**
 * Unlink a task from an assignment.
 * Expects: id (path param)
 * Requires: authenticateToken + requireStudentRole + loadTask + authorizeTaskAccess middleware
 */
export const unlinkTaskFromAssignment = async (req: TaskRequest, res: Response) => {
  const task = req.task;

  try {
    await prisma.taskAssignmentRelation.delete({
      where: { tid: task.id },
    });

    return res.status(200).json({ message: "Task unlinked from assignment successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Task is not linked to any assignment" });
    }
    console.error("Unlink Task from Assignment Error:", error);
    return res.status(500).json({ message: "Failed to unlink task from assignment" });
  }
};
