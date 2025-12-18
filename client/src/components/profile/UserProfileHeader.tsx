import React, { useEffect, useState } from 'react';
import BadgeButton from '../badge/BadgeButton';
import BadgeChips from '../badge/BadgeChips';
import InviteToTaskModal from './InviteToTaskModal';
import api from '../../services/api';
import { UserPlus, Mail, Award, Briefcase, GraduationCap, ExternalLink } from 'lucide-react'

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
    <>
      {/* Hero Banner with Gradient Background */}
      <div className="relative mb-8 overflow-hidden rounded-xl border border-border bg-card">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-primary-100/50 via-background to-background dark:from-primary-900/20 dark:via-background dark:to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-tech-blue-500)_0%,transparent_50%)] opacity-5" />
        
        {/* Content */}
        <div className="relative px-6 py-8 md:px-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar Section */}
            <div className="shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-br from-primary/30 to-accent-teal/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-background shadow-lg bg-linear-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700">
                  {viewedUser?.avatar_file_id ? (
                    <img src={viewedAvatarUrl || ''} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Name & Role */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    {viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : 'User'}
                  </h1>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-linear-to-r from-primary/10 to-accent-teal/10 text-primary border border-primary/20">
                    {isStudent ? <GraduationCap className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                    <span>{viewedUser?.role?.toUpperCase()}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{viewedUser?.email}</span>
                </div>

                {/* Badge Section for Students */}
                {isStudent && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <BadgeButton
                      to={`/profile/${viewedUser?.id}/badges`}
                      className=""
                    />
                    <BadgeChips userId={viewedUser?.id} />
                  </div>
                )}
              </div>

              {/* Instructor Details */}
              {isInstructor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {viewedUser.title && (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 transition-colors hover:bg-muted/30">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Title</p>
                        <p className="text-sm font-medium text-foreground truncate">{viewedUser.title}</p>
                      </div>
                    </div>
                  )}
                  {viewedUser.expertise && (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 transition-colors hover:bg-muted/30">
                      <Award className="h-4 w-4 text-accent-teal shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Expertise</p>
                        <p className="text-sm font-medium text-foreground truncate">{viewedUser.expertise}</p>
                      </div>
                    </div>
                  )}
                  {scholarHref && (
                    <a
                      href={scholarHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 transition-all hover:bg-muted/30 hover:border-primary/40 group"
                    >
                      <ExternalLink className="h-4 w-4 text-info shrink-0 group-hover:text-primary transition-colors" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Scholar Profile</p>
                        <p className="text-sm font-medium text-primary truncate group-hover:underline">Google Scholar</p>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isStudent && isOtherUser && isCurrentUserStudent && (
            <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-border/50">
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow-md hover:bg-primary/90 transition-all duration-200"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite to Task</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <InviteToTaskModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        invitedStudentId={viewedUser?.id ?? 0}
        invitedStudentName={viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : undefined}
      />
    </>
  );
};

export default UserProfileHeader;
