import React from 'react';
import BadgeButton from '../badge/BadgeButton';
import BadgeChips from '../badge/BadgeChips';

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
  return (
    <div className="mb-6">
      <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-200 flex items-center justify-center overflow-hidden border-4 border-white shadow flex-shrink-0">
          {viewedUser?.avatar_file_id ? (
            <img src={viewedAvatarUrl || ''} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{(viewedUser?.fname?.charAt(0) ?? '') + (viewedUser?.lname?.charAt(0) ?? '')}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{viewedUser ? `${viewedUser.fname} ${viewedUser.lname}` : 'User'}</h2>
            {viewedUser && viewedUser.role && viewedUser.role.toLowerCase() === 'student' && (
              <div className="ml-4">
                <BadgeChips />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{viewedUser?.email}</p>
          <p className="text-xs mt-2 font-medium text-primary">{viewedUser?.role?.toUpperCase()}</p>
          {viewedUser?.role === 'instructor' && (
            <div className="mt-3 text-sm">
              {viewedUser.google_scholar && (
                <div className="mb-1"><a href={viewedUser.google_scholar} target="_blank" rel="noreferrer" className="text-primary underline">Google Scholar</a></div>
              )}
              {viewedUser.title && <div className="text-muted-foreground">{viewedUser.title}</div>}
              {viewedUser.expertise && <div className="text-muted-foreground">Expertise: {viewedUser.expertise}</div>}
            </div>
          )}
        </div>
        {/* Badge button shown for students */}
        {viewedUser && viewedUser.role && viewedUser.role.toLowerCase() === 'student' && (
          <div className="ml-auto">
            <BadgeButton className="w-auto px-4 py-2 aspect-auto rounded-md" />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileHeader;
