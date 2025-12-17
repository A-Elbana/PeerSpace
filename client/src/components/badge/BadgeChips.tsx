import React, { useEffect, useState } from 'react';
import api, { badgeApi, userApi, type BadgeResponse } from '../../services/api';

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
    <div className="flex items-center gap-2">
        <style>{`
          @keyframes badge-shine { 0% { transform: translateX(-100%) rotate(25deg); } 100% { transform: translateX(100%) rotate(25deg); } }
          .badge-shine {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 70%);
            opacity: 0.85;
            pointer-events: none;
            mix-blend-mode: overlay;
            animation: badge-shine 1.6s linear infinite;
          }
        `}</style>
      {badges.map((b) => {
        const id = String(b.id);
        const isImage = Boolean(b.icon_url) && !failedImgs.has(id);
        return isImage ? (
          <div key={id} title={b.name} className="relative w-8 h-8 rounded-full overflow-hidden border shadow-sm flex items-center justify-center" style={{ borderColor: '#00A86B', backgroundColor: 'transparent' }}>
            <img
              src={b.icon_url}
              alt={b.name}
              className="w-full h-full object-cover"
              onError={() => setFailedImgs(prev => { const s = new Set(prev); s.add(id); return s; })}
            />
            <div className="badge-shine" />
          </div>
        ) : (
          <div key={id} title={b.name} className="relative inline-flex items-center h-8 px-3 rounded-full shadow-sm max-w-[12rem] overflow-hidden" style={{ backgroundColor: '#00A86B', color: 'white', borderColor: '#00A86B' }}>
            <span className="text-sm leading-tight truncate whitespace-nowrap">{b.name ?? ''}</span>
            <div className="badge-shine" />
          </div>
        );
      })}
    </div>
  );
};

export default BadgeChips;
