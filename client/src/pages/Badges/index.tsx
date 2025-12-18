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
  Crown,
  Star,
  Flame,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ProfileProps {
  onLogout?: () => void;
}

type RarityTier = 'common' | 'rare' | 'epic' | 'legendary';

interface EnhancedBadge extends BadgeResponse {
  rarity?: RarityTier;
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
        const allResp = await badgeApi.getAll({ page: 1, limit: 50 });
        
        // Enhance badges with mock data for demo (replace with real data from backend)
        const enhancedAll = (allResp.data ?? []).map((badge, idx) => ({
          ...badge,
          rarity: ['common', 'rare', 'epic', 'legendary'][idx % 4] as RarityTier,
          globalCompletion: Math.floor(Math.random() * 100),
          category: ['Learning', 'Collaboration', 'Achievement', 'Special'][idx % 4],
        }));
        
        setAllBadges(enhancedAll);

        if (userId) {
          const uid = Number(userId);
          const resp = await badgeApi.getByUserId(uid, { page: 1, limit: 50 });
          const earned = resp.data?.map((entry: any) => ({
            ...entry.Badge,
            earnedDate: entry.date_earned,
            rarity: enhancedAll.find(b => b.id === entry.Badge.id)?.rarity,
            globalCompletion: enhancedAll.find(b => b.id === entry.Badge.id)?.globalCompletion,
            category: enhancedAll.find(b => b.id === entry.Badge.id)?.category,
          })) ?? [];
          setUserBadges(earned);
        } else {
          const mineResp = await badgeApi.getMine({ page: 1, limit: 50 });
          const earned = mineResp.data?.map((entry: any) => ({
            ...entry.Badge,
            earnedDate: entry.date_earned,
            rarity: enhancedAll.find(b => b.id === entry.Badge.id)?.rarity,
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

  const getRarityConfig = (rarity?: RarityTier) => {
    switch (rarity) {
      case 'legendary':
        return {
          label: 'Legendary',
          gradient: 'from-amber-400 via-yellow-500 to-amber-600',
          glow: 'shadow-2xl shadow-amber-500/50',
          border: 'border-amber-400',
          bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30',
          text: 'text-amber-600 dark:text-amber-400',
          icon: Crown,
        };
      case 'epic':
        return {
          label: 'Epic',
          gradient: 'from-purple-400 via-purple-500 to-purple-600',
          glow: 'shadow-xl shadow-purple-500/40',
          border: 'border-purple-400',
          bg: 'bg-gradient-to-br from-purple-50 to-purple-50 dark:from-purple-950/30 dark:to-purple-950/30',
          text: 'text-purple-600 dark:text-purple-400',
          icon: Flame,
        };
      case 'rare':
        return {
          label: 'Rare',
          gradient: 'from-blue-400 via-blue-500 to-blue-600',
          glow: 'shadow-lg shadow-blue-500/30',
          border: 'border-blue-400',
          bg: 'bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30',
          text: 'text-blue-600 dark:text-blue-400',
          icon: Sparkles,
        };
      default:
        return {
          label: 'Common',
          gradient: 'from-gray-400 via-gray-500 to-gray-600',
          glow: 'shadow-md shadow-gray-500/20',
          border: 'border-gray-400',
          bg: 'bg-gradient-to-br from-gray-50 to-gray-50 dark:from-gray-950/30 dark:to-gray-950/30',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Star,
        };
    }
  };

  const getRarityColors = (rarity?: RarityTier) => {
    switch (rarity) {
      case 'legendary':
        return { confetti: ['#fbbf24', '#f59e0b', '#d97706'] };
      case 'epic':
        return { confetti: ['#a855f7', '#9333ea', '#7e22ce'] };
      case 'rare':
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
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const lockedBadges = allBadges.filter(b => !userBadges.some(ub => ub.id === b.id));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
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
                    {userBadges.map((badge) => {
                      const config = getRarityConfig(badge.rarity);
                      const RarityIcon = config.icon;
                      
                      return (
                        <motion.div
                          key={badge.id}
                          variants={itemVariants}
                          whileHover={{ scale: 1.05, y: -5 }}
                          onClick={() => handleBadgeClick(badge, true)}
                          className={`group relative cursor-pointer rounded-xl border-2 ${config.border} ${config.bg} p-6 transition-all ${config.glow}`}
                        >
                          {/* Rarity badge */}
                          <div className={`absolute top-3 right-3 px-2 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-bold flex items-center gap-1`}>
                            <RarityIcon className="h-3 w-3" />
                            {config.label}
                          </div>

                          {/* Badge Image */}
                          <div className="relative mb-4">
                            <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                            <div className="relative h-32 w-32 mx-auto">
                              {badge.icon_url ? (
                                <img
                                  src={badge.icon_url}
                                  alt={badge.name}
                                  className="h-full w-full object-contain drop-shadow-2xl"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-6xl">
                                  ✨
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Badge Info */}
                          <div className="text-center space-y-2">
                            <h3 className="font-bold text-foreground">{badge.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {badge.description || 'Achievement unlocked'}
                            </p>
                            
                            {badge.earnedDate && (
                              <p className="text-xs text-muted-foreground/70">
                                Earned {new Date(badge.earnedDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center p-4">
                            <span className="text-white text-sm font-medium flex items-center gap-1">
                              View Details <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
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
                  {lockedBadges.map((badge, idx) => {
                    const config = getRarityConfig(badge.rarity);
                    const RarityIcon = config.icon;
                    
                    return (
                      <motion.div
                        key={badge.id}
                        variants={itemVariants}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => handleBadgeClick(badge, false)}
                        className="group relative cursor-pointer rounded-xl border-2 border-dashed border-border bg-card p-6 transition-all hover:border-blue-400 hover:shadow-lg"
                      >
                        {/* Rarity badge */}
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-bold flex items-center gap-1 opacity-50`}>
                          <RarityIcon className="h-3 w-3" />
                          {config.label}
                        </div>

                        {/* Locked Badge Image */}
                        <div className="relative mb-4">
                          <div className="relative h-32 w-32 mx-auto grayscale opacity-30 group-hover:opacity-50 transition-opacity">
                            {badge.icon_url ? (
                              <img
                                src={badge.icon_url}
                                alt={badge.name}
                                className="h-full w-full object-contain blur-sm group-hover:blur-none transition-all"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-6xl">
                                🔒
                              </div>
                            )}
                          </div>
                          
                          {/* Lock overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="p-3 rounded-full bg-muted/80 backdrop-blur-sm">
                              <Lock className="h-6 w-6 text-muted-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Badge Info */}
                        <div className="text-center space-y-2">
                          <h3 className="font-bold text-foreground opacity-70">{badge.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {badge.description || 'Complete the challenge to unlock'}
                          </p>

                          {/* Global Completion Rate */}
                          {badge.globalCompletion !== undefined && (
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{badge.globalCompletion}% of students earned this</span>
                            </div>
                          )}

                          {/* How to Earn */}
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBadgeClick(badge, false);
                              }}
                            >
                              <Target className="h-3 w-3 mr-1" />
                              How to Earn
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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
              className="bg-card border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className={`relative p-8 bg-gradient-to-br ${getRarityConfig(selectedBadge.rarity).gradient} text-white`}>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-center gap-4">
                  {/* Badge Image */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-2xl" />
                    <div className="relative h-32 w-32">
                      {selectedBadge.icon_url ? (
                        <img
                          src={selectedBadge.icon_url}
                          alt={selectedBadge.name}
                          className={`h-full w-full object-contain drop-shadow-2xl ${
                            !userBadges.some(b => b.id === selectedBadge.id) ? 'grayscale opacity-50' : ''
                          }`}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-6xl">
                          {userBadges.some(b => b.id === selectedBadge.id) ? '✨' : '🔒'}
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
              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Description</h3>
                  <p className="text-foreground">
                    {selectedBadge.description || 'Complete specific challenges to earn this prestigious badge.'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedBadge.category && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Category</div>
                      <div className="font-semibold text-foreground">{selectedBadge.category}</div>
                    </div>
                  )}
                  {selectedBadge.globalCompletion !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Rarity</div>
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedBadge.globalCompletion}% earned
                      </div>
                    </div>
                  )}
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
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Target className="h-5 w-5" />
                      <span className="font-semibold">How to Earn</span>
                    </div>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                      Complete the required challenges and milestones to unlock this badge. Keep progressing through your courses and participate actively!
                    </p>
                    
                    {/* Mock Progress */}
                    {selectedBadge.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-blue-600/70 dark:text-blue-400/70">
                          <span>Your Progress</span>
                          <span>{selectedBadge.progress}%</span>
                        </div>
                        <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${selectedBadge.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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