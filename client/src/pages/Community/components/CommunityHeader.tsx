import React, { useState } from 'react';
import { Users, FileText, Globe, Lock, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityHeaderProps {
  name: string;
  id: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
  postCount: number;
  isInstructor?: boolean;
}

const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  name,
  id,
  description,
  type,
  memberCount,
  postCount,
  isInstructor = false,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('Community ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy ID');
    }
  };

  return (
    <>
      <div className="bg-background border border-border rounded-lg p-6 mb-6">
        {/* Community Name and Type Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{name}</h1>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type === 'PUBLIC'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-yellow-500/10 text-yellow-500'
              }`}>
              {type === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {type}
            </span>
          </div>

          {/* Invite Button for Instructors */}
          {isInstructor && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
            >
              <Copy className="w-4 h-4" />
              Share Community ID
            </button>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-muted-foreground mb-4">
            {description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{memberCount} members</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{postCount} posts</span>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Share Community ID</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Share this ID with students to invite them to join <span className="font-semibold text-foreground">{name}</span>
            </p>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
              <input
                type="text"
                value={id}
                readOnly
                className="flex-1 bg-transparent text-sm text-foreground font-mono focus:outline-none truncate"
              />
              <button
                onClick={handleCopyId}
                className={`p-2 rounded-md transition-all ${copied
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Students can use this ID in their dashboard to join the community.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CommunityHeader;
