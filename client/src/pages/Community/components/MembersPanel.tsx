import React, { useState } from 'react';
import { Users, GraduationCap, User } from 'lucide-react';
import { toast } from 'sonner';
import ClassmateCard from './ClassmateCard';
import { useResolvedFileUrl } from '../../../hooks/useResolvedFileUrl';

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
  role: string;
}

interface MembersPanelProps {
  instructors: Member[];
  students: Member[];
  currentUserId: number;
  isLoading: boolean;
  isCurrentUserInstructor?: boolean;
}

const MembersPanel: React.FC<MembersPanelProps> = ({
  instructors,
  students,
  currentUserId,
  isLoading,
  isCurrentUserInstructor = false,
}) => {
  const [invitingMemberId, setInvitingMemberId] = useState<number | null>(null);

  const InstructorItem: React.FC<{ instructor: Member }> = ({ instructor }) => {
    const avatarUrl = useResolvedFileUrl(instructor.avatar_file_id);

    return (
      <div className="flex items-center gap-3 py-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${instructor.fname} ${instructor.lname}`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}
        <span className="text-sm font-medium text-foreground">
          {instructor.fname} {instructor.lname}
        </span>
      </div>
    );
  };

  const handleInviteToTeam = async (memberId: number) => {
    setInvitingMemberId(memberId);
    try {
      // TODO: Implement actual team invite API call
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Team invitation sent!');
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setInvitingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg p-4 space-y-6">
      {/* Instructor Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Instructor</h3>
        </div>

        {instructors.length > 0 ? (
          <div className="space-y-2">
            {instructors.map((instructor) => (
              <InstructorItem key={instructor.id} instructor={instructor} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No instructor assigned</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Classmates Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Classmates</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {students.length} member{students.length !== 1 ? 's' : ''}
          </span>
        </div>

        {students.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {students.map((student) => (
              <ClassmateCard
                key={student.id}
                member={student}
                currentUserId={currentUserId}
                onInvite={handleInviteToTeam}
                isInviting={invitingMemberId === student.id}
                hideInviteButton={isCurrentUserInstructor}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No classmates yet</p>
        )}
      </div>
    </div>
  );
};

export default MembersPanel;
