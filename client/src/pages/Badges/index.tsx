import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/dashboard';
import BadgeCard from '../../components/badge/BadgeCard';
import { badgeApi, type BadgeResponse } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface ProfileProps {
  onLogout?: () => void;
}

const BadgesPage: React.FC<ProfileProps> = ({ onLogout }) => {
  const [allBadges, setAllBadges] = useState<BadgeResponse[]>([]);
  const [myBadges, setMyBadges] = useState<BadgeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [allResp, mineResp] = await Promise.all([
          badgeApi.getAll({ page: 1, limit: 50 }),
          badgeApi.getMine({ page: 1, limit: 50 }),
        ]);
        setAllBadges(allResp.data ?? []);
        const earned = mineResp.data?.map(entry => entry.Badge) ?? [];
        setMyBadges(earned);
      } catch (err) {
        console.error('Failed to load badges', err);
        setError('Could not load badges right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar onLogout={onLogout || (() => {})} />
      <main className="flex-1 ml-20 p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Badges</h1>
            <p className="text-sm text-muted-foreground">Track what you have earned and what is available.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading badges...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">My Badges</h2>
                <span className="text-xs text-muted-foreground">{myBadges.length} unlocked</span>
              </div>
              {myBadges.length === 0 ? (
                <div className="text-sm text-muted-foreground">No badges yet. Participate to earn your first badge.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      title={badge.name}
                      description={badge.description || 'Unlocked badge'}
                      imageUrl={badge.icon_url}
                      earned
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">All Badges</h2>
                <span className="text-xs text-muted-foreground">{allBadges.length} available</span>
              </div>
              {allBadges.length === 0 ? (
                <div className="text-sm text-muted-foreground">No badges configured yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      title={badge.name}
                      description={badge.description || 'Earn this badge by completing goals.'}
                      imageUrl={badge.icon_url}
                      earned={myBadges.some(b => b.id === badge.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default BadgesPage;