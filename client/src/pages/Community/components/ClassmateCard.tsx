import React from 'react';
import { User, Eye } from 'lucide-react';
import { useResolvedFileUrl } from '../../../hooks/useResolvedFileUrl';

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
  role: string;
}

interface ClassmateCardProps {
  member: Member;
  currentUserId: number;
  onViewProfile: (memberId: number) => void;
}

const ClassmateCard: React.FC<ClassmateCardProps> = ({
  member,
  currentUserId,
  onViewProfile,
}) => {
  const isCurrentUser = member.id === currentUserId;
  const avatarUrl = useResolvedFileUrl(member.avatar_file_id);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
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

      {/* View Profile Button - show for all users */}
      <button
        onClick={() => onViewProfile(member.id)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
      >
        <Eye className="w-3 h-3" />
        View
      </button>
    </div>
  );
};

export default ClassmateCard;
