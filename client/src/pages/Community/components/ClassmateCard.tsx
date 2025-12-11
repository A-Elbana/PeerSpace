import React from 'react';
import { User, UserPlus, Loader2 } from 'lucide-react';

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_url: string | null;
  role: string;
}

interface ClassmateCardProps {
  member: Member;
  currentUserId: number;
  onInvite: (memberId: number) => void;
  isInviting: boolean;
  hideInviteButton?: boolean;
}

const ClassmateCard: React.FC<ClassmateCardProps> = ({
  member,
  currentUserId,
  onInvite,
  isInviting,
  hideInviteButton = false,
}) => {
  const isCurrentUser = member.id === currentUserId;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={`${member.fname} ${member.lname}`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}

        {/* Name */}
        <span className="text-sm text-foreground">
          {member.fname} {member.lname}
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground ml-1">(You)</span>
          )}
        </span>
      </div>

      {/* Invite Button - only show for other users and if not hidden */}
      {!isCurrentUser && !hideInviteButton && (
        <button
          onClick={() => onInvite(member.id)}
          disabled={isInviting}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {isInviting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserPlus className="w-3 h-3" />
          )}
          Invite
        </button>
      )}
    </div>
  );
};

export default ClassmateCard;
