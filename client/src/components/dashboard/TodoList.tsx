import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface TodoItem {
  id: string;
  title: string;
  assignee?: {
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface TodoListProps {
  items: TodoItem[];
  onAddItem?: () => void;
  onToggleItem?: (itemId: string) => void;
  onViewItem?: (itemId: string) => void;
  title?: string;
  subtitle?: string;
}

const TodoList: React.FC<TodoListProps> = ({
  items,
  onAddItem,
  onToggleItem,
  onViewItem,
  title = 'To-Do List',
  subtitle
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Plus size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Todo Items */}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Checkbox */}
              <button
                onClick={() => onToggleItem?.(item.id)}
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                  transition-all duration-200
                  ${item.completed
                    ? 'bg-frosted-blue-500 border-frosted-blue-500'
                    : 'border-gray-300 hover:border-frosted-blue-400'
                  }
                `}
              >
                {item.completed && <Check size={12} className="text-white" />}
              </button>

              {/* Assignee Avatar */}
              {item.assignee && (
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={item.assignee.avatar} alt={item.assignee.name} />
                  <AvatarFallback className="bg-gradient-to-br from-royal-gold-400 to-royal-gold-600 text-white text-xs">
                    {getInitials(item.assignee.name)}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Title */}
              <span className={`text-sm flex-1 truncate ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                {item.title}
              </span>
            </div>

            {/* Due Date / Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewItem?.(item.id)}
              className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
            >
              {item.dueDate ? `Deam ${formatDueDate(item.dueDate)}` : 'Review test'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoList;
