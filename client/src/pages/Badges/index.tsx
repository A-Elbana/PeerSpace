import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Sidebar 
} from '../../components/dashboard';
import { badgeApi, type BadgeResponse } from '../../services/api';
import { 
  Trophy, 
  Award, 
  Lock, 
  Sparkles, 
  Target, 
  TrendingUp,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { BadgeCard, getRarityConfig, type RarityTier } from '../../components/BadgeCard';

interface ProfileProps {
  onLogout?: () => void;
}

interface EnhancedBadge extends BadgeResponse {
  globalCompletion?: number;
  progress?: number;
  category?: string;
  earnedDate?: string;
}

const BadgesPage: React.FC<ProfileProps> = ({ onLogout }) => {
  const { userId } = useParams() as { userId?: string };
  const [allBadges, setAllBadges] = useState<EnhancedBadge[]>([]);
  const [userBadges, setUserBadges] = useState<EnhancedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<EnhancedBadge | null>(null);
  const [newlyEarnedIds, setNewlyEarnedIds] = useState<Set<number>>(new Set());

  // Calculate user stats
  const masteryLevel = Math.floor((userBadges.length / Math.max(allBadges.length, 1)) * 100);
  const userRank = masteryLevel >= 80 ? 'Elite' : masteryLevel >= 50 ? 'Expert' : masteryLevel >= 25 ? 'Rising Star' : 'Novice';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all badges with full response including rarity
        const allResp = await badgeApi.getAll({ page: 1, limit: 50 });
        
        // Enhance badges with additional metadata
        const enhancedAll = (allResp.data ?? []).map((badge, idx) => ({
          ...badge,
          globalCompletion: badge._count?.StudentBadge ?? Math.floor(Math.random() * 100), // Use actual count or fallback
          category: ['Learning', 'Collaboration', 'Achievement', 'Special'][idx % 4],
        }));
        
        setAllBadges(enhancedAll);

        if (userId) {
          const uid = Number(userId);
          const resp = await badgeApi.getByUserId(uid, { page: 1, limit: 50 });
          const earned = resp.data?.map((entry: any) => ({
            ...entry.Badge,
            earnedDate: entry.date_earned,
            globalCompletion: enhancedAll.find(b => b.id === entry.Badge.id)?.globalCompletion,
            category: enhancedAll.find(b => b.id === entry.Badge.id)?.category,
          })) ?? [];
          setUserBadges(earned);
        } else {
          const mineResp = await badgeApi.getMine({ page: 1, limit: 50 });
          const earned = mineResp.data?.map((entry: any) => ({
            ...entry.Badge,
            earnedDate: entry.date_earned,
            globalCompletion: enhancedAll.find(b => b.id === entry.Badge.id)?.globalCompletion,
            category: enhancedAll.find(b => b.id === entry.Badge.id)?.category,
          })) ?? [];
          setUserBadges(earned);
        }
      } catch (err) {
        console.error('Failed to load badges', err);
        setError('Could not load badges right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleBadgeClick = (badge: EnhancedBadge, isEarned: boolean) => {
    setSelectedBadge(badge);
    
    // Trigger confetti for newly viewed earned badges
    if (isEarned && !newlyEarnedIds.has(badge.id)) {
      setNewlyEarnedIds(prev => new Set(prev).add(badge.id));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: getRarityColors(badge.rarity).confetti,
      });
    }
  };

  const getRarityColors = (rarity?: RarityTier) => {
    switch (rarity) {
      case 'LEGENDARY':
        return { confetti: ['#fbbf24', '#f59e0b', '#d97706'] };
      case 'EPIC':
        return { confetti: ['#a855f7', '#9333ea', '#7e22ce'] };
      case 'RARE':
        return { confetti: ['#3b82f6', '#2563eb', '#1d4ed8'] };
      default:
        return { confetti: ['#9ca3af', '#6b7280', '#4b5563'] };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const lockedBadges = allBadges.filter(b => !userBadges.some(ub => ub.id === b.id));

  return (
    <div className="flex min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <Sidebar onLogout={onLogout || (() => {})} />
      
      <main className="flex-1 ml-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Hero Section - Narrative Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-linear-to-r from-turf-green-500 to-frosted-blue-500 p-8 text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Trophy Room</h1>
                  <p className="text-white/80">Your journey to mastery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rank */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5" />
                    <span className="text-sm font-medium">Current Rank</span>
                  </div>
                  <div className="text-2xl font-bold">{userRank}</div>
                </div>

                {/* Badges Count */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm font-medium">Badges Earned</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {userBadges.length} / {allBadges.length}
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Mastery Level</span>
                  </div>
                  <div className="text-2xl font-bold">{masteryLevel}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress to Elite Status</span>
                  <span>{masteryLevel}%</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${masteryLevel}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-linear-to-r from-green-400 to-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading your trophy collection...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : (
            <div className="space-y-12">
              
              {/* My Collection */}
              <section>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Zap className="h-6 w-6 text-amber-500" />
                      My Collection
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {userBadges.length} badge{userBadges.length !== 1 ? 's' : ''} unlocked
                    </p>
                  </div>
                </motion.div>

                {userBadges.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-border rounded-2xl p-16 text-center"
                  >
                    <div className="max-w-sm mx-auto space-y-4">
                      <div className="p-6 rounded-2xl bg-muted/50 inline-block">
                        <Trophy className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-lg font-semibold">Start Your Journey</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete challenges and unlock your first badge to begin your collection!
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {userBadges.map((badge) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={true}
                        onClick={() => handleBadgeClick(badge, true)}
                        animationVariants={itemVariants}
                      />
                    ))}
                  </motion.div>
                )}
              </section>

              {/* Hall of Fame - Available Badges */}
              <section>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Lock className="h-6 w-6 text-blue-500" />
                      Hall of Fame
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {lockedBadges.length} badge{lockedBadges.length !== 1 ? 's' : ''} waiting to be unlocked
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  {lockedBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      isEarned={false}
                      onClick={() => handleBadgeClick(badge, false)}
                      animationVariants={itemVariants}
                    />
                  ))}
                </motion.div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Badge Detail Dialog */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className={`relative p-8 bg-linear-to-br ${getRarityConfig(selectedBadge.rarity).gradient} text-white`}>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-center gap-4">
                  {/* Badge Image - Using lucide icon */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-3xl" />
                    <div className="relative w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center">
                      {React.createElement(getRarityConfig(selectedBadge.rarity).icon, { 
                        className: `h-16 w-16 ${userBadges.some(b => b.id === selectedBadge.id) ? 'drop-shadow-2xl' : 'opacity-50'}`,
                        strokeWidth: 2.5 
                      })}
                      {!userBadges.some(b => b.id === selectedBadge.id) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                            <Lock className="h-8 w-8" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badge Name & Rarity */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                      {React.createElement(getRarityConfig(selectedBadge.rarity).icon, { className: 'h-4 w-4' })}
                      <span className="text-sm font-bold">{getRarityConfig(selectedBadge.rarity).label}</span>
                    </div>
                    <h2 className="text-2xl font-bold">{selectedBadge.name}</h2>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Description</h3>
                  <p className="text-foreground">
                    {selectedBadge.description || 'Complete specific challenges to earn this prestigious badge.'}
                  </p>
                </div>

                {/* Earned Status or How to Earn */}
                {userBadges.some(b => b.id === selectedBadge.id) ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Award className="h-5 w-5" />
                      <span className="font-semibold">Achievement Unlocked!</span>
                    </div>
                    {selectedBadge.earnedDate && (
                      <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                        Earned on {new Date(selectedBadge.earnedDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Target className="h-5 w-5" />
                      <span className="font-semibold">How to Earn</span>
                    </div>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-2">
                      Complete the required challenges and milestones to unlock this badge. Keep progressing through your courses and participate actively!
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {userBadges.some(b => b.id === selectedBadge.id) ? 'Awesome!' : 'Got It!'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BadgesPage;