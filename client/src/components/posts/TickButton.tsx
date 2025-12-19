import React, { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { postApi } from '../../services/api';
import { toast } from 'sonner';

interface TickButtonProps {
  postId: number;
  isResolved: boolean | null;
  isAuthor: boolean;
  onToggled?: (resolved: boolean) => void;
}

const TickButton: React.FC<TickButtonProps> = ({ postId, isResolved, isAuthor, onToggled }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const resp = await postApi.toggleResolved(postId);
      const newResolved = Boolean((resp as any)?.is_resolved);
      onToggled?.(newResolved);
      toast.success(newResolved ? 'Marked resolved' : 'Marked open');
    } catch (err) {
      console.error('Failed to toggle resolved', err);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Render a single large icon only. Author gets a clickable button, others see an indicator.
  const baseClasses = 'inline-flex items-center justify-center rounded-full transition-shadow';
  const resolvedClasses = 'text-chart-2';
  const unresolvedClasses = 'text-chart-3';

  if (isAuthor) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={!!isResolved}
        title={isResolved ? 'Mark as open' : 'Mark as resolved'}
        className={`${baseClasses} ${isResolved ? 'bg-chart-2/20' : 'bg-accent/50'} p-2 shadow-md hover:shadow-lg focus:outline-none cursor-pointer`}
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle className={`w-6 h-6 ${isResolved ? resolvedClasses : unresolvedClasses}`} />
        )}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} p-1`} title={isResolved ? 'Resolved by the author' : 'Open'}>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      ) : (
        <CheckCircle className={`w-6 h-6 ${isResolved ? resolvedClasses : unresolvedClasses}`} />
      )}
    </div>
  );
};

export default TickButton;
