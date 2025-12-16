import React, { useEffect, useState } from 'react';
import { badgeApi, type BadgeResponse } from '../../services/api';

const BadgeChips: React.FC = () => {
  const [badges, setBadges] = useState<BadgeResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await badgeApi.getMine({ page: 1, limit: 3 });
        const items = resp?.data?.map((e: any) => e.Badge) ?? [];
        if (mounted) setBadges(items.slice(0, 3));
      } catch (err) {
        console.error('Failed to load badges for chips', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  if (loading || badges.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {badges.map((b) => (
        <div key={b.id} title={b.name} className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm bg-white/10 flex items-center justify-center">
          {b.icon_url ? (
            <img src={b.icon_url} alt={b.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-white px-1">{b.name?.slice(0,2).toUpperCase()}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default BadgeChips;
