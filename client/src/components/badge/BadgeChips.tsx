import React, { useEffect, useState } from 'react';
import api, { badgeApi, type BadgeResponse } from '../../services/api';
import { Award } from 'lucide-react';

interface BadgeChipsProps {
  userId?: number | null;
  limit?: number;
}

const BadgeChips: React.FC<BadgeChipsProps> = ({ userId = undefined, limit = 3 }) => {
  const [badges, setBadges] = useState<BadgeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        let resp: any;
        const me = await api.get('/auth/me');
        if ((userId !== me.data?.id) && userId) {
          resp = await badgeApi.getByUserId(userId, { page: 1, limit });
        } else {
          resp = await badgeApi.getMine({ page: 1, limit });
          
          
        }
        const items = resp?.data?.map((e: any) => e.Badge) ?? [];
        if (mounted) setBadges(items.slice(0, limit));
      } catch (err) {
        console.error('Failed to load badges for chips', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [userId, limit]);

  if (loading || badges.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <style>{`
        @keyframes badge-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .badge-shimmer-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          pointer-events: none;
          animation: badge-shimmer 2s ease-in-out infinite;
        }
      `}</style>
      {badges.map((b) => {
        const id = String(b.id);
        const isImage = Boolean(b.icon_url) && !failedImgs.has(id);
        return isImage ? (
          <div
            key={id}
            title={b.name}
            className="relative group w-9 h-9 rounded-full overflow-hidden border-2 border-success/40 bg-linear-to-br from-success/10 to-success/5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 flex items-center justify-center"
          >
            <img
              src={b.icon_url}
              alt={b.name}
              className="w-full h-full object-cover"
              onError={() => setFailedImgs(prev => { const s = new Set(prev); s.add(id); return s; })}
            />
            <div className="badge-shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div
            key={id}
            title={b.name}
            className="relative group inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-linear-to-r from-success to-turf-green-600 text-white shadow-sm hover:shadow-md max-w-48 overflow-hidden transition-all duration-200 hover:scale-105"
          >
            <Award className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium leading-tight truncate whitespace-nowrap">{b.name ?? ''}</span>
            <div className="badge-shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
};

export default BadgeChips;
