import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showNewTaskButton?: boolean;
  onNewTask?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showNewTaskButton = true,
  onNewTask
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {showNewTaskButton && (
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <Button
            onClick={onNewTask}
            className="flex items-center gap-2 bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
          >
            <Plus size={18} />
            <span>New Task</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Header;
