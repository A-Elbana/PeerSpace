import prisma from "../config/prisma";

/**
 * Action type enum for activity logs
 * Keep these in sync with what your frontend/analytics expects
 */
export enum ActivityActionType {
  // Community actions
  COMMUNITY_CREATED = 1,
  COMMUNITY_UPDATED = 2,
  COMMUNITY_DELETED = 3,
  USER_JOINED_COMMUNITY = 4,
  USER_LEFT_COMMUNITY = 5,

  // Post actions
  POST_CREATED = 10,
  POST_UPDATED = 11,
  POST_DELETED = 12,
  POST_RESOLVED = 13,

  // Comment actions
  COMMENT_CREATED = 20,
  COMMENT_UPDATED = 21,
  COMMENT_DELETED = 22,
  COMMENT_APPROVED = 23,
  COMMENT_REJECTED = 24,

  // Assignment actions
  ASSIGNMENT_CREATED = 30,
  ASSIGNMENT_UPDATED = 31,
  ASSIGNMENT_DELETED = 32,

  // Submission actions
  SUBMISSION_CREATED = 40,
  SUBMISSION_GRADED = 41,
  SUBMISSION_FEEDBACK_GIVEN = 42,

  // Task actions
  TASK_CREATED = 50,
  TASK_UPDATED = 51,
  TASK_DELETED = 52,
  TASK_ASSIGNEE_INVITED = 53,
  TASK_ASSIGNEE_ACCEPTED = 54,
  TASK_ASSIGNEE_DECLINED = 55,
  TASK_ASSIGNEE_REMOVED = 56,

  // User actions
  USER_ROLE_CHANGED = 60,
  USER_ACTIVATED = 61,
  USER_DEACTIVATED = 62,
  USER_REGISTERED = 63,
  USER_LOGGED_IN = 64,
  USER_LOGGED_OUT = 65,

  // Note actions
  NOTE_CREATED = 70,
  NOTE_UPDATED = 71,
  NOTE_DELETED = 72,
}

interface LogActivityParams {
  userId: number;
  communityId?: string | undefined;
  actionType: ActivityActionType;
  description: string;
}

/**
 * ActivityLogService
 * Centralized service for logging user activities and system events
 * Use this in controllers after successful operations
 */
class ActivityLogService {
  /**
   * Main method to log an activity
   * Should be called after successful operations in controllers
   * @param params - Log parameters
   */
  static async logActivity(params: LogActivityParams): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          associated_uid: params.userId,
          associated_cid: params.communityId ? String(params.communityId) : null,
          action_type: params.actionType,
          description: params.description,
          date: new Date(),
        },
      });
    } catch (error) {
      // Log to console but don't throw - activity logging should not break the main operation
      console.error(
        `Failed to log activity: ${params.description}`,
        error
      );
    }
  }

  /**
   * Log community creation
   */
  static async logCommunityCreated(
    userId: number,
    communityId: string,
    communityName: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.COMMUNITY_CREATED,
      description: `Created community "${communityName}"`,
    });
  }

  /**
   * Log community update
   */
  static async logCommunityUpdated(
    userId: number,
    communityId: string,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.COMMUNITY_UPDATED,
      description,
    });
  }

  /**
   * Log community deletion
   */
  static async logCommunityDeleted(
    userId: number,
    communityId: string,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.COMMUNITY_DELETED,
      description,
    });
  }

  /**
   * Log post creation
   */
  static async logPostCreated(
    userId: number,
    communityId: string,
    postTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.POST_CREATED,
      description: `Created post "${postTitle}"`,
    });
  }

  /**
   * Log post deletion
   */
  static async logPostDeleted(
    userId: number,
    communityId: string,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.POST_DELETED,
      description,
    });
  }

  /**
   * Log post update
   */
  static async logPostUpdated(
    userId: number,
    communityId: string,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.POST_UPDATED,
      description,
    });
  }

  /**
   * Log post resolution
   */
  static async logPostResolved(
    userId: number,
    communityId: string,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.POST_RESOLVED,
      description,
    });
  }

  /**
   * Log comment creation
   */
  static async logCommentCreated(
    userId: number,
    communityId: string,
    postTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.COMMENT_CREATED,
      description: `Commented on post "${postTitle}"`,
    });
  }

  /**
   * Log comment deletion
   */
  static async logCommentDeleted(
    userId: number,
    communityId: string,
    postTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.COMMENT_DELETED,
      description: `Deleted comment on post "${postTitle}"`,
    });
  }

  /**
   * Log assignment creation
   */
  static async logAssignmentCreated(
    userId: number,
    communityId: string,
    assignmentTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.ASSIGNMENT_CREATED,
      description: `Created assignment "${assignmentTitle}"`,
    });
  }

  /**
   * Log submission grading
   */
  static async logSubmissionGraded(
    userId: number,
    communityId: string,
    grade: number,
    maxPoints?: number
  ): Promise<void> {
    const gradeStr = maxPoints ? `${grade}/${maxPoints}` : `${grade}`;
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.SUBMISSION_GRADED,
      description: `Graded a submission: ${gradeStr}`,
    });
  }

  /**
   * Log task creation
   */
  static async logTaskCreated(
    userId: number,
    taskTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      actionType: ActivityActionType.TASK_CREATED,
      description: `Created task "${taskTitle}"`,
    });
  }

  /**
   * Log task assignee invitation
   */
  static async logTaskAssigneeInvited(
    userId: number,
    communityId: string | undefined,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.TASK_ASSIGNEE_INVITED,
      description,
    });
  }

  /**
   * Log task assignee acceptance
   */
  static async logTaskAssigneeAccepted(
    userId: number,
    communityId: string | undefined,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.TASK_ASSIGNEE_ACCEPTED,
      description,
    });
  }

  /**
   * Log task assignee decline
   */
  static async logTaskAssigneeDeclined(
    userId: number,
    communityId: string | undefined,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.TASK_ASSIGNEE_DECLINED,
      description,
    });
  }

  /**
   * Log task assignee removal
   */
  static async logTaskAssigneeRemoved(
    userId: number,
    communityId: string | undefined,
    description: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType: ActivityActionType.TASK_ASSIGNEE_REMOVED,
      description,
    });
  }

  /**
   * Log user role change
   */
  static async logUserRoleChanged(
    userId: number,
    targetUserName: string,
    newRole: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      actionType: ActivityActionType.USER_ROLE_CHANGED,
      description: `Changed ${targetUserName}'s role to ${newRole}`,
    });
  }

  /**
   * Log note creation
   */
  static async logNoteCreated(
    userId: number,
    noteTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      actionType: ActivityActionType.NOTE_CREATED,
      description: `Created note "${noteTitle}"`,
    });
  }

  /**
   * Log note deletion
   */
  static async logNoteDeleted(
    userId: number,
    noteTitle: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      actionType: ActivityActionType.NOTE_DELETED,
      description: `Deleted note "${noteTitle}"`,
    });
  }

  /**
   * Generic activity logging for custom scenarios
   * Use this when specific helper methods don't exist
   */
  static async log(
    userId: number,
    actionType: ActivityActionType,
    description: string,
    communityId?: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      communityId,
      actionType,
      description,
    });
  }
}

export default ActivityLogService;
