import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface InviteToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitedStudentId: number;
  invitedStudentName?: string;
}

interface SimpleTask {
  id: number;
  title: string;
  end_date?: string | null;
}

const InviteToTaskModal: React.FC<InviteToTaskModalProps> = ({ isOpen, onClose, invitedStudentId, invitedStudentName }) => {
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    void loadTasks();
  }, [isOpen]);

  const loadTasks = async () => {
    setFetching(true);
    try {
      const resp = await api.get('/tasks', { params: { page: 1, limit: 200 } });
      const backend = resp.data?.data ?? [];
      const mapped: SimpleTask[] = backend.map((t: any) => ({ id: t.id, title: t.title ?? t.name ?? 'Untitled', end_date: t.end_date ?? null }));
      setTasks(mapped);
    } catch (err) {
      console.error('Failed to load tasks', err);
      toast.error('Failed to load your tasks');
    } finally {
      setFetching(false);
    }
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const invite = async () => {
    if (selected.size === 0) return toast.warning('Select at least one task');
    setLoading(true);
    try {
      const promises = Array.from(selected).map(tid => api.post('/task-assignees/invite', { taskId: Number(tid), invitedStudentId }));
      await Promise.all(promises);
      toast.success('Invitations sent');
      setSelected(new Set());
      onClose();
    } catch (err) {
      console.error('Failed to send invites', err);
      toast.error('Failed to send some invites');
      toast.error((err as any).response.data.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-xl w-full bg-card rounded-lg border border-border p-6 z-10">
        <h3 className="text-lg font-semibold mb-2">Invite {invitedStudentName ?? 'student'} to tasks</h3>
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your tasks..."
            className="w-full px-3 py-2 rounded border border-border bg-background mb-3"
          />

          <div className="flex flex-col gap-3 max-h-64 overflow-auto">
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks found.</div>
            ) : (
              tasks
                .filter(t => t.title.toLowerCase().includes(query.trim().toLowerCase()))
                .map(t => {
                  const active = selected.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggle(t.id)}
                      className={`p-3 rounded-lg border cursor-pointer select-none transition-shadow ${active ? 'bg-frosted-blue-500/10 border-frosted-blue-500 shadow-md' : 'bg-card border-border hover:shadow-sm'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{t.title}</div>
                          {t.end_date && <div className="text-xs text-muted-foreground">Due {new Date(t.end_date).toLocaleDateString()}</div>}
                        </div>
                        <div className="ml-3 text-sm">
                          {active ? <span className="text-frosted-blue-600">Selected</span> : <span className="text-muted-foreground">Select</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={invite} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteToTaskModal;
