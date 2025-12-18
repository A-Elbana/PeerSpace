import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { submissionApi } from '../../services/api';

interface SubmissionListProps {
  assignmentId: number;
  currentUser?: { id: number; role: string } | null;
}

const SubmissionCard: React.FC<{ sub: any; onClick?: () => void }> = ({ sub, onClick }) => {
  const date = new Date(sub.subm_date).toLocaleString();
  const studentName = sub?.Student?.User ? `${sub.Student.User.fname} ${sub.Student.User.lname}` : `Student #${sub.sid}`;

  return (
    <div onClick={onClick} className="bg-card border border-border rounded-lg p-3 cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-foreground truncate">{studentName}</div>
          <div className="text-xs text-muted-foreground mt-1">Submitted: {date}</div>
        </div>
        <div className="text-xs text-muted-foreground">{sub.grade !== null && sub.grade !== undefined ? `Grade: ${sub.grade}` : 'Ungraded'}</div>
      </div>
    </div>
  );
};

const SubmissionList: React.FC<SubmissionListProps> = ({ assignmentId, currentUser }) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const LIMIT = 10;

  useEffect(() => {
    let mounted = true;
    const fetch = async (p = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await submissionApi.getByAssignment(assignmentId, { page: p, limit: LIMIT });
        if (!mounted) return;
        setSubs(res.data || []);
        setMeta(res.meta ?? null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Failed to load submissions');
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };
    void fetch(page);
    return () => { mounted = false; };
  }, [assignmentId, page]);

  const navigate = useNavigate();

  if (!currentUser) return null;
  const role = currentUser.role?.toLowerCase();
  // Only instructors (the assigner) and admin should see this; filtering of which instructor is done by parent
  if (role !== 'instructor' && role !== 'admin') return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h4 className="font-semibold text-sm mb-3">Submissions</h4>
      {isLoading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : subs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No submissions yet</div>
      ) : (
        <>
          <div className="space-y-3">
            {subs.map((s) => (
              <SubmissionCard key={s.id} sub={s} onClick={() => navigate(`/submission/${s.id}`)} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || page <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-sm text-muted-foreground">Page {meta ? meta.page : page}{meta ? ` of ${meta.totalPages}` : ''}</div>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading || (meta ? page >= meta.totalPages : subs.length < LIMIT)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SubmissionList;
