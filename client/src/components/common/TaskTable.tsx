import React from 'react';
import { Calendar, Flag, Link, Loader2, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';

interface Assignee {
  id: number;
  fname: string;
  lname: string;
  isAccepted: boolean;
}

export interface Task {
  id: string;
  name: string;
  assignees: Assignee[];
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  assignmentRelation: string;
  completed: boolean;
}

interface Props {
  taskList: Task[];
  title: string;
  isFetching?: boolean;
  updatingTaskIds?: string[];
  onRowClick?: (taskId: string) => void;
  onToggleComplete?: (task: any, e?: React.MouseEvent) => void;
  onDelete?: (task: any, e?: React.MouseEvent) => void;
}

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-muted-foreground';
  }
};

const getInitials = (fname: string, lname: string) => `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase();

const getAvatarColor = (index: number) => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-green-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  return colors[index % colors.length];
};

const AssigneeAvatar: React.FC<{ assignee: Assignee; index: number }> = ({ assignee, index }) => {

  
  const initials = getInitials(assignee.fname, assignee.lname);

  
  return (
    <div className="relative">
      <div
        className={`w-8 h-8 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xs font-bold border-2 shadow-sm ${!assignee.isAccepted ? 'border-yellow-400' : 'border-background'}`}
        title={`${assignee.fname} ${assignee.lname}`}
      >
        {initials}
      </div>
      {!assignee.isAccepted && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-background shadow-sm" />
      )}
    </div>
  );
};

export const TaskTable: React.FC<Props> = ({ taskList, title, isFetching = false, updatingTaskIds = [], onRowClick, onToggleComplete, onDelete }) => {
    console.log(taskList);
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
        {title}
        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{taskList.length}</span>
        {isFetching && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2" />}
      </h2>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
          <div>Name</div>
          <div className="w-48 text-center">Assignees</div>
          <div className="w-32 text-center">Due date</div>
          <div className="w-24 text-center">Priority</div>
          <div className="w-12 text-center">Done</div>
          <div className="w-12"></div>
        </div>

        <div className="divide-y divide-border">
          {taskList.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">No {title.toLowerCase()} tasks found.</div>
          ) : (
            taskList.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group cursor-pointer"
                onClick={() => onRowClick?.(task.id)}
              >
                <div className="flex flex-col min-w-0 justify-center">
                  <div className={`font-medium truncate ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full ${task.completed ? 'opacity-50' : ''}`}>
                      <Link className="w-3 h-3" />
                      {task.assignmentRelation || 'No Relation'}
                    </span>
                  </div>
                </div>

                <div className="w-48 flex items-center justify-center">
                  <div className={`flex -space-x-2 ${task.completed ? 'opacity-50' : ''}`}>
                    {task.assignees.length > 0 ? (
                      <>
                        {task.assignees.slice(0, 4).map((assignee, index) => (
                          <AssigneeAvatar key={assignee.id} assignee={assignee} index={index} />
                        ))}
                        {task.assignees.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold border-2 border-background shadow-sm">+{task.assignees.length - 4}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                <div className="w-32 flex items-center justify-center">
                  <div className={`flex items-center gap-2 text-sm ${task.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{task.dueDate || '-'}</span>
                  </div>
                </div>

                <div className="w-24 flex items-center justify-center">
                  <Flag className={`w-5 h-5 ${task.completed ? 'text-muted-foreground' : getPriorityColor(task.priority)}`} fill="currentColor" />
                </div>

                <div className="w-12 flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete?.(task, e); }}
                    disabled={updatingTaskIds.includes(task.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${task.completed ? 'text-green-500 hover:text-green-600 bg-green-500/10' : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'}`}
                    title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {updatingTaskIds.includes(task.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : (task.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />)}
                  </button>
                </div>

                <div className="w-12 flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(task, e); }}
                    className="w-8 h-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskTable;
