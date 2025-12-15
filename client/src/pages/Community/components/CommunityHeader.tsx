import React, { useEffect, useState } from 'react';
import { Users, FileText, Globe, Lock, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface CommunityHeaderProps {
  name: string;
  id: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
  postCount: number;
  bannerUrl?: string | null;
  isInstructor?: boolean;
  isEnrolled?: boolean;
  onEnroll?: () => void;
}

const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  name,
  id,
  description,
  type,
  memberCount,
  postCount,
  bannerUrl,
  isInstructor = false,
  isEnrolled = false,
  onEnroll,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedBannerUrl, setResolvedBannerUrl] = useState<string | null>(bannerUrl ?? null);

  useEffect(() => {
    const isUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
    if (!bannerUrl) {
      if (resolvedBannerUrl !== null) setResolvedBannerUrl(null);
      return;
    }
    if (isUrl(bannerUrl)) {
      setResolvedBannerUrl(bannerUrl);
      return;
    }
    // bannerUrl is actually a File UUID; fetch its secure_url
    (async () => {
      try {
        const res = await api.get(`/files/${bannerUrl}`);
        const file = res.data?.data;
        const url: string | undefined = file?.signed_url || file?.secure_url;
        setResolvedBannerUrl(url ?? null);
      } catch (err) {
        console.error('Failed to resolve banner file URL', err);
        setResolvedBannerUrl(null);
      }
    })();
  }, [bannerUrl]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('Community ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy ID');
    }
  };

  return (
    <>
      <div className="bg-background border border-border rounded-lg overflow-hidden mb-6">
        {/* Banner Image */}
        {resolvedBannerUrl && (
          <div className="relative w-full h-48 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <img
              src={resolvedBannerUrl}
              alt={`${name} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error and show gradient background
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Content Section */}
        <div className="p-6">
          {/* Community Name and Type Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{name}</h1>
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type === 'PUBLIC'
                ? 'bg-turf-green-500/10 text-turf-green-600'
                : 'bg-royal-gold-500/10 text-royal-gold-600'
                }`}>
                {type === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {type}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Join Button for public non-enrolled users */}
              {!isEnrolled && !isInstructor && type === 'PUBLIC' && onEnroll && (
                <button
                  onClick={onEnroll}
                  className="flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-tech-blue-500/30"
                >
                  Join Community
                </button>
              )}

              {/* Invite Button for Instructors */}
              {isInstructor && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-tech-blue-500/30"
                >
                  <Copy className="w-4 h-4" />
                  Share Community ID
                </button>
              )}
            </div>
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
                  ? 'bg-turf-green-500/20 text-turf-green-600'
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
