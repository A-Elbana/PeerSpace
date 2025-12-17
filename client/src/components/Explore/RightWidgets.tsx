import React, { useEffect, useState } from 'react';
import { Users, Filter, Lock, Loader2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { instructorApi } from '../../services/api';
import CommunityItem from '../../components/common/CommunityItem';
import DeadlineItem from '../../components/common/DeadlineItem';

interface RightSideProps {
  user?: any;
  pendingSubmissions?: any[];
  deadlines?: any[];
  communities: any[];
  privateCommunities: any[];
  communityFilterSearch: string;
  isCommunityFilterOpen: boolean;
  communityFilterRef: React.RefObject<HTMLDivElement | null>;
  setIsCommunityFilterOpen: (v: boolean) => void;
  setCommunityFilterSearch?: (v: string) => void;
  joiningCommunityId: string | null;
  onJoinCommunity: (id: string) => void;
  enrolledCommunityIds: Set<string>;
  onNavigate: (id: string) => void;
  navigate: any;
  handleLoadMorePublic: () => void;
  isLoadingPublic: boolean;
  hasMorePublic: boolean;
  handleLoadMorePrivate: () => void;
  isLoadingPrivate: boolean;
  hasMorePrivate: boolean;
}

const RightSide: React.FC<RightSideProps> = ({
  user,
  pendingSubmissions = [],
  deadlines = [],
  communities = [],
  privateCommunities = [],
  communityFilterSearch,
  isCommunityFilterOpen,
  communityFilterRef,
  setIsCommunityFilterOpen,
  setCommunityFilterSearch,
  joiningCommunityId,
  onJoinCommunity,
  enrolledCommunityIds = new Set(),
  onNavigate,
  navigate,
  handleLoadMorePublic,
  isLoadingPublic,
  hasMorePublic,
  handleLoadMorePrivate,
  isLoadingPrivate,
  hasMorePrivate,
}) => {
  const [managedCommunities, setManagedCommunities] = useState<any[]>([]);
  const [isLoadingManaged, setIsLoadingManaged] = useState(false);
  const [managedPage, setManagedPage] = useState(1);
  const [hasMoreManaged, setHasMoreManaged] = useState(true);
  const [managedMeta, setManagedMeta] = useState<any | null>(null);
  // Pending submissions pagination (instructor)
  const [managedPending, setManagedPending] = useState<any[]>(pendingSubmissions || []);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingMeta, setPendingMeta] = useState<any | null>(null);
  const [hasMorePending, setHasMorePending] = useState(true);

  const fetchManaged = async (page = 1) => {
    setIsLoadingManaged(true);
    try {
      const res = await instructorApi.getManagedCommunities({ page, limit: 5 });
      const data = res?.data || [];
      setManagedCommunities(data);
      const meta = res?.meta ?? null;
      setManagedMeta(meta);
      setHasMoreManaged(meta ? page < meta.totalPages : data.length === 5);
      setManagedPage(page);
    } catch (err) {
      console.error('Failed to load managed communities', err);
    } finally {
      setIsLoadingManaged(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'instructor') return;
    void fetchManaged(1);
    void fetchPending(1);
  }, [user]);

  // When managed communities load, try to fill in missing community names for pending items
  useEffect(() => {
    if (managedCommunities.length === 0) return;
    setManagedPending((prev) =>
      prev.map((p) => ({
        ...p,
        communityName: p.communityName && p.communityName !== p.cid ? p.communityName : (managedCommunities.find((c) => c.id === p.cid)?.name || ''),
      }))
    );
  }, [managedCommunities]);

  const fetchPending = async (page = 1) => {
    setIsLoadingPending(true);
    try {
      const res = await instructorApi.getManagedSubmissions({ page, limit: 5 });
      const submissions = res?.data || [];

      // Group submissions by assignment and count ungraded submissions per assignment
      const assignmentsMap = new Map<number, { id: number; title: string; cid: string; ungradedCount: number }>();
      submissions.forEach((s: any) => {
        const aid = s.aid as number;
        const assign = s.Assignment;
        if (!assign) return;
        const existing = assignmentsMap.get(aid);
        const isUngraded = s.grade === null || s.grade === undefined;
        if (existing) {
          existing.ungradedCount += isUngraded ? 1 : 0;
        } else {
          assignmentsMap.set(aid, {
            id: assign.id,
            title: assign.title,
            cid: assign.cid,
            ungradedCount: isUngraded ? 1 : 0,
          });
        }
      });

      // Convert map to array and try to resolve community names from managedCommunities
      const grouped = Array.from(assignmentsMap.values()).map((a) => {
        const comm = managedCommunities.find((c) => c.id === a.cid) as any;
        return {
          ...a,
          communityName: comm ? comm.name : a.cid,
        };
      });

      // Hide raw community IDs until we can resolve a friendly name
      const hiddenIdGrouped = grouped.map(g => ({ ...g, communityName: g.communityName && g.communityName !== g.cid ? g.communityName : '' }));
      setManagedPending(hiddenIdGrouped);
      const meta = res?.meta ?? null;
      setPendingMeta(meta);
      setHasMorePending(meta ? page < meta.totalPages : submissions.length === 5);
      setPendingPage(page);
    } catch (err) {
      console.error('Failed to load pending submissions', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const loadMoreManaged = async () => {
    if (isLoadingManaged) return;
    const next = managedPage + 1;
    if (managedMeta && next > managedMeta.totalPages) return;
    await fetchManaged(next);
  };
  return (
    <div className="hidden lg:block lg:w-80 xl:w-96 space-y-6 overflow-y-auto scrollbar-hide no-scrollbar max-h-[calc(100vh-3rem)] sticky top-6">
      {user?.role === 'instructor' ? (
        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-frosted-blue-500/10 to-transparent rounded-bl-full" />

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-frosted-blue-500" />
              My Communities
            </h3>
          </div>

          <div className="space-y-4">
            {managedCommunities.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-frosted-blue-500/20 to-turf-green-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">You don't manage any communities yet.</p>
              </div>
            ) : (
              managedCommunities.map((community: any, index: number) => (
                <CommunityItem
                  key={community.id}
                  communityId={community.id}
                  name={community.name}
                  description={community.description || 'No description'}
                  color={['bg-tech-blue-500', 'bg-turf-green-500', 'bg-destructive', 'bg-royal-gold-500', 'bg-frosted-blue-500'][index % 5]}
                  isJoining={joiningCommunityId === community.id}
                  onJoin={() => onJoinCommunity(community.id)}
                  isStudent={user?.role === 'student'}
                  isEnrolled={enrolledCommunityIds.has(community.id)}
                  onNavigate={(id: string) => onNavigate(id)}
                />
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => fetchManaged(Math.max(1, managedPage - 1))}
              disabled={isLoadingManaged || managedPage <= 1}
              aria-label="Previous page"
              title="Previous page"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-muted-foreground px-2">Page {managedPage}{managedMeta ? ` of ${managedMeta.totalPages}` : ''}</div>
            <button
              onClick={() => fetchManaged(managedPage + 1)}
              disabled={isLoadingManaged || (managedMeta ? managedPage >= managedMeta.totalPages : !hasMoreManaged)}
              aria-label="Next page"
              title="Next page"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-frosted-blue-500/10 to-transparent rounded-bl-full" />

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-frosted-blue-500" />
              Public Communities
            </h3>

            <div className="relative" ref={communityFilterRef}>
              <button
                onClick={() => setIsCommunityFilterOpen(!isCommunityFilterOpen)}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${communityFilterSearch ? 'text-primary bg-muted' : 'text-muted-foreground'}`}
              >
                <Filter size={14} />
              </button>

              {isCommunityFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search communities..."
                        value={communityFilterSearch}
                        onChange={(e) => setCommunityFilterSearch ? setCommunityFilterSearch(e.target.value) : undefined}
                        className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                        autoFocus
                      />
                    </div>
                    {communityFilterSearch && setCommunityFilterSearch && (
                      <button
                        onClick={() => setCommunityFilterSearch('')}
                        className="mt-2 w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex items-center gap-2 text-destructive rounded-lg"
                      >
                        <X size={14} />
                        Clear search
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {communityFilterSearch && (
            <div className="flex items-center gap-1.5 mb-3 text-xs">
              <span className="text-muted-foreground">Filtering:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-frosted-blue-500/10 text-frosted-blue-600 font-medium rounded-full">
                "{communityFilterSearch}"
                <button
                  onClick={() => setIsCommunityFilterOpen(false)}
                  className="hover:bg-frosted-blue-500/20 rounded-full transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          <div className="space-y-4">
            {communities.filter((c: any) => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-frosted-blue-500/20 to-turf-green-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {communityFilterSearch ? 'No communities match your search.' : 'No public communities found.'}
                </p>
              </div>
            ) : (
              communities
                .filter((c: any) => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase()))
                .slice(0, hasMorePublic ? 3 : communities.length)
                .map((community: any, index: number) => (
                  <CommunityItem
                    key={community.id}
                    communityId={community.id}
                    name={community.name}
                    description={community.description || 'No description'}
                    color={['bg-tech-blue-500', 'bg-turf-green-500', 'bg-destructive', 'bg-royal-gold-500', 'bg-frosted-blue-500'][index % 5]}
                    isJoining={joiningCommunityId === community.id}
                    onJoin={() => onJoinCommunity(community.id)}
                    isStudent={user?.role === 'student'}
                    isEnrolled={enrolledCommunityIds.has(community.id)}
                    onNavigate={(id: string) => onNavigate(id)}
                  />
                ))
            )}
          </div>
          {hasMorePublic && communities.filter((c: any) => c.name.toLowerCase().includes(communityFilterSearch.toLowerCase())).length > 0 && (
            <button
              onClick={handleLoadMorePublic}
              disabled={isLoadingPublic}
              className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground flex items-center justify-center"
            >
              {isLoadingPublic ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Show More
            </button>
          )}
        </div>
      )}

      {user?.role !== 'instructor' && (
        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-frosted-blue-500/10 to-transparent rounded-bl-full" />

          <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-frosted-blue-500" />
            Private Communities
          </h3>
          <div className="space-y-4">
            {privateCommunities.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-frosted-blue-500/20 to-tech-blue-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No private communities yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Join or create one to see it here.</p>
              </div>
            ) : (
              privateCommunities.map((community: any, index: number) => (
                <CommunityItem
                  key={community.id}
                  communityId={community.id}
                  name={community.name}
                  description={community.description || 'No description'}
                  color={['bg-frosted-blue-500', 'bg-royal-gold-500', 'bg-tech-blue-500', 'bg-turf-green-500', 'bg-destructive'][index % 5]}
                  isJoining={joiningCommunityId === community.id}
                  onJoin={() => onJoinCommunity(community.id)}
                  isStudent={user?.role === 'student'}
                  isPrivate
                  isEnrolled={enrolledCommunityIds.has(community.id)}
                  onNavigate={(id: string) => onNavigate(id)}
                />
              ))
            )}
          </div>
          {hasMorePrivate && (
            <button
              onClick={handleLoadMorePrivate}
              disabled={isLoadingPrivate}
              className="w-full mt-4 py-2 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground flex items-center justify-center"
            >
              {isLoadingPrivate ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Show More
            </button>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-frosted-blue-500 via-turf-green-500 to-royal-gold-500 opacity-50" />

        <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-frosted-blue-500" />
          {user?.role === 'instructor' ? 'Pending Actions' : 'Upcoming Deadlines'}
        </h3>
        <div className="space-y-3">
          {user?.role === 'instructor' ? (
            <>
              {managedPending.length > 0 ? (
                managedPending.map((assignment: any, idx: number) => (
                  <DeadlineItem
                    key={idx}
                    course={assignment.communityName}
                    task={assignment.title}
                    due={`${assignment.ungradedCount} submission${assignment.ungradedCount !== 1 ? 's' : ''} to grade`}
                    isInstructor
                    onClick={() => navigate(`/community/${assignment.cid}/assignment/${assignment.id}`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No pending submissions</p>
              )}

              {/* Pending actions pager */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => fetchPending(Math.max(1, pendingPage - 1))}
                  disabled={isLoadingPending || pendingPage <= 1}
                  aria-label="Previous pending page"
                  title="Previous"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-sm text-muted-foreground px-2">Page {pendingPage}{pendingMeta ? ` of ${pendingMeta.totalPages}` : ''}</div>
                <button
                  onClick={() => fetchPending(pendingPage + 1)}
                  disabled={isLoadingPending || (pendingMeta ? pendingPage >= pendingMeta.totalPages : !hasMorePending)}
                  aria-label="Next pending page"
                  title="Next"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-sm font-medium hover:bg-muted/80 transition-colors text-foreground disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              {deadlines.length > 0 ? (
                deadlines.map((assignment: any, idx: number) => (
                  <DeadlineItem
                    key={idx}
                    course={assignment.communityName}
                    task={assignment.title}
                    due={assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                    onClick={() => navigate(`/community/${assignment.cid}/assignment/${assignment.id}`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Local fallback for Clock icon to avoid extra dependency import in this file
const ClockIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    <path d="M12 7v5l3 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default RightSide;