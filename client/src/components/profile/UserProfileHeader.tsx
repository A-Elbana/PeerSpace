import React, { useEffect, useState } from 'react';
import BadgeButton from '../badge/BadgeButton';
import BadgeChips from '../badge/BadgeChips';
import InviteToTaskModal from './InviteToTaskModal';
import api from '../../services/api';
import {UserPlus} from 'lucide-react'

interface UserData {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  avatar_file_id?: string;
  google_scholar?: string;
  expertise?: string;
  title?: string;
}

interface Props {
  viewedUser: UserData | null;
  viewedAvatarUrl?: string | null;
}

const UserProfileHeader: React.FC<Props> = ({ viewedUser, viewedAvatarUrl }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMe = async () => {
      try {
        const resp = await api.get('/auth/me');
        if (mounted) setCurrentUser(resp.data);
      } catch (err) {
        console.log(err);
      }
    };
    void fetchMe();
    return () => { mounted = false; };
  }, []);

  const isStudent = viewedUser?.role?.toLowerCase() === 'student';
  const isInstructor = viewedUser?.role?.toLowerCase() === 'instructor';
  const isCurrentUserStudent = currentUser?.role?.toLowerCase() === 'student';
  const isOtherUser = viewedUser && currentUser && viewedUser.id !== currentUser.id;

  const initials = `${viewedUser?.fname?.charAt(0) ?? ''}${viewedUser?.lname?.charAt(0) ?? ''}`;
  const scholarHref = viewedUser?.google_scholar;

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 -top-16 h-40 bg-gradient-to-br from-cyan-400/25 via-teal-400/20 to-indigo-500/15 blur-3xl" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        <div className="relative p-8 md:p-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-8 md:gap-10 md:items-start">
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900 dark:to-teal-900 flex items-center justify-center overflow-hidden border-2 border-border shadow-lg">
                {viewedUser?.avatar_file_id ? (
                  <img src={viewedAvatarUrl || ''} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-primary">{initials}</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight truncate">
                    {viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : 'User'}
                  </h1>
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                    {viewedUser?.role?.toUpperCase()}
                  </span>
                </div>

                {isStudent && (
                  <div className="flex flex-wrap items-center gap-3">
                    <BadgeButton
                      to={`/profile/${viewedUser?.id}/badges`}
                      className="px-4 py-2 rounded-lg font-medium bg-muted/70 hover:bg-muted transition-all duration-200"
                    />
                    <BadgeChips userId={viewedUser?.id} />
                  </div>
                )}

                <p className="text-sm md:text-base text-muted-foreground truncate">{viewedUser?.email}</p>
              </div>

              {isInstructor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {viewedUser.title && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground font-medium whitespace-nowrap">Title</span>
                      <span className="text-foreground">{viewedUser.title}</span>
                    </div>
                  )}
                  {viewedUser.expertise && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground font-medium whitespace-nowrap">Expertise</span>
                      <span className="text-foreground">{viewedUser.expertise}</span>
                    </div>
                  )}
                  {scholarHref && (
                    <a
                      href={scholarHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-primary hover:text-primary/80 hover:border-primary/40 transition-colors"
                    >
                      <span className="text-muted-foreground font-medium whitespace-nowrap">Scholar</span>
                      <span className="underline decoration-dotted">Google Scholar</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {isStudent && isOtherUser && isCurrentUserStudent && (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg hover:bg-primary/90 transition-all duration-200"
              >
                <UserPlus className='h-6 w-6' />
                <span>Invite to task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <InviteToTaskModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        invitedStudentId={viewedUser?.id ?? 0}
        invitedStudentName={viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : undefined}
      />
    </div>
  );
};

export default UserProfileHeader;
