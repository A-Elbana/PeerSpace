import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search, X, Menu, MessageSquare, TrendingUp, Users, Home } from 'lucide-react';
import NotificationContext from '../contexts/NotificationContext';
import { useResolvedFileUrl } from '../hooks/useResolvedFileUrl';
import { useSidebar } from '../contexts/SidebarContext';
import { useExploreSearch } from '../hooks/useExploreSearch';

interface UserInfo {
    id?: number | string;
    fname?: string;
    lname?: string;
    avatar_file_id?: string | null;
}

const Avatar: React.FC<{ user?: UserInfo; size?: number }> = ({ user, size = 32 }) => {
    const initials = user?.fname ? `${user.fname[0]}${user.lname?.[0] ?? ''}`.toUpperCase() : 'U';
    const resolvedUrl = useResolvedFileUrl(user?.avatar_file_id ?? null);
    return (
        <div
            style={{ width: size, height: size }}
            className="shrink-0 rounded-full bg-gradient-to-br from-primary to-chart-2 text-white font-semibold flex items-center justify-center overflow-hidden shadow-sm"
        >
            {resolvedUrl ? (
                <img src={resolvedUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
                <span style={{ fontSize: size * 0.4 }}>{initials}</span>
            )}
        </div>
    );
};

interface HeaderProps {
    user?: UserInfo | null;
    onLogout?: () => void;
    searchValue?: string;
    onSearchChange?: (v: string) => void;
    searchedPosts?: Array<any>;
    searchedCommunities?: Array<any>;
    searchedUsers?: Array<any>;
    isSearching?: boolean;
    unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({
    user,
    onLogout,
    searchValue: externalSearchValue,
    onSearchChange: externalOnSearchChange,
    searchedPosts: externalSearchedPosts,
    searchedCommunities: externalSearchedCommunities,
    searchedUsers: externalSearchedUsers,
    isSearching: externalIsSearching,
    unreadCount = 0,
}) => {
    const navigate = useNavigate();
    const { sidebarWidth } = useSidebar();

    // Use the custom search hook
    const {
        query: localQuery,
        setQuery: setLocalQuery,
        results,
        loading: localLoading
    } = useExploreSearch(externalSearchValue || '');

    // Synchronize with external search if provided
    const searchValue = externalOnSearchChange ? externalSearchValue : localQuery;
    const onSearchChange = externalOnSearchChange || setLocalQuery;
    const searchedPosts = externalOnSearchChange ? externalSearchedPosts || [] : results.posts;
    const searchedCommunities = externalOnSearchChange ? externalSearchedCommunities || [] : results.communities;
    const searchedUsers = externalOnSearchChange ? externalSearchedUsers || [] : results.users;
    const isSearching = externalOnSearchChange ? externalIsSearching : localLoading;

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const ctx = useContext(NotificationContext);
    const effectiveUnread = ctx ? ctx.unreadCount : unreadCount;

    // Ensure notifications are fetched when header mounts so badge is populated
    useEffect(() => {
        if (ctx && typeof ctx.fetchNotifications === 'function') {
            ctx.fetchNotifications().catch(() => { });
        }
    }, [ctx]);

    const [hidden, setHidden] = useState(false);
    const lastScrollY = useRef<number>(typeof window !== 'undefined' ? window.scrollY : 0);
    const ticking = useRef(false);

    useEffect(() => {
        const onScroll = () => {
            if (ticking.current) return;
            ticking.current = true;
            requestAnimationFrame(() => {
                const currentY = window.scrollY;
                const delta = currentY - lastScrollY.current;
                if (delta > 5 && currentY > 50) {
                    setHidden(true);
                } else if (delta < -5 || currentY <= 50) {
                    setHidden(false);
                }
                lastScrollY.current = currentY;
                ticking.current = false;
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '/' && (document.activeElement?.tagName ?? '') !== 'INPUT' && (document.activeElement?.tagName ?? '') !== 'TEXTAREA') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsFocused(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const showSearchResults = isFocused && searchValue && (searchedPosts?.length > 0 || searchedCommunities?.length > 0 || searchedUsers?.length > 0 || isSearching);

    return (
        <header
            className="sticky top-0 z-30 w-full px-3 sm:px-4 lg:pr-4 bg-transparent transition-all duration-300"
            style={{ paddingLeft: `${sidebarWidth + 16}px`, transform: hidden ? 'translateY(-110%)' : 'translateY(0)' }}
        >
            <div className="max-w-6xl mx-auto w-full bg-card border border-border rounded-2xl shadow-sm px-4 sm:px-6">
                <div className="flex items-center justify-between h-12 sm:h-14 gap-2 sm:gap-4">
                    {/* Left Section - Logo & Nav */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
                        >
                            <Menu className="w-5 h-5 text-foreground" />
                        </button>

                        {/* Logo */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                PS
                            </div>
                            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                                PeerSpace
                            </span>
                        </button>
                    </div>

                    {/* Center Section - Search */}
                    <div className="flex-1 max-w-2xl" ref={searchRef}>
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    ref={inputRef}
                                    value={searchValue ?? ''}
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            onSearchChange?.('');
                                            setIsFocused(false);
                                        }
                                    }}
                                    placeholder="Search PeerSpace (press /)"
                                    className="w-full h-9 sm:h-10 pl-10 pr-10 rounded-full border border-input bg-background/50 focus:bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                                />
                                {searchValue && (
                                    <button
                                        onClick={() => {
                                            onSearchChange?.('');
                                            setIsFocused(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent"
                                    >
                                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {showSearchResults && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto no-scrollbar">
                                    {isSearching && (
                                        <div className="px-4 py-8 text-center text-muted-foreground">
                                            <div className="inline-block w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                                            <p className="mt-2 text-sm">Searching...</p>
                                        </div>
                                    )}

                                    {!isSearching && searchedPosts.length === 0 && searchedCommunities.length === 0 && (searchedUsers?.length === 0) && (
                                        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                                            No results found for "{searchValue}"
                                        </div>
                                    )}

                                    {searchedCommunities && searchedCommunities.length > 0 && (
                                        <div className="border-b border-border">
                                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Communities
                                            </div>
                                            {searchedCommunities.map((comm: any) => (
                                                <button
                                                    key={comm.id}
                                                    onClick={() => {
                                                        navigate(`/community/${comm.id}`);
                                                        setIsFocused(false);
                                                    }}
                                                    className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
                                                >
                                                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-1 text-left">
                                                        <div className="font-medium text-sm truncate text-foreground">{comm.name}</div>
                                                        {comm.description && (
                                                            <div className="text-xs text-muted-foreground truncate">{comm.description}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchedUsers && searchedUsers.length > 0 && (
                                        <div className="border-b border-border">
                                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Users
                                            </div>
                                            {searchedUsers.map((u: any) => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => {
                                                        navigate(`/profile/${u.id}`);
                                                        setIsFocused(false);
                                                    }}
                                                    className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
                                                >
                                                    <Avatar user={u} size={32} />
                                                    <div className="flex-1 text-left text-sm">
                                                        <div className="font-medium text-foreground">{u.fname} {u.lname}</div>
                                                        <div className="text-xs text-muted-foreground">{u.role}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchedPosts && searchedPosts.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Posts
                                            </div>
                                            {searchedPosts.map((post: any) => (
                                                <button
                                                    key={post.id}
                                                    onClick={() => {
                                                        navigate(`/community/${post.cid}/post/${post.id}`);
                                                        setIsFocused(false);
                                                    }}
                                                    className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3"
                                                >
                                                    <MessageSquare className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 text-left">
                                                        <div className="font-medium text-sm line-clamp-2 text-foreground">{post.title}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {post.User && `${post.User.fname} ${post.User.lname}`}
                                                            {post.User && ' • '}
                                                            {new Date(post.post_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Section - Actions & Profile */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Notifications */}
                        <button
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 rounded-full hover:bg-accent transition-colors group"
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            {effectiveUnread > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-[11px] font-semibold rounded-full bg-destructive text-destructive-foreground">
                                    {effectiveUnread > 99 ? '99+' : effectiveUnread}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors"
                            >
                                <Avatar user={user ?? undefined} size={32} />
                            </button>

                            {/* User Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-border">
                                        <div className="flex items-center gap-3">
                                            <Avatar user={user ?? undefined} size={40} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate text-foreground">
                                                    {user?.fname} {user?.lname}
                                                </div>
                                                <div className="text-xs text-muted-foreground">View Profile</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                navigate(user?.id ? `/profile/${user.id}` : '/profile');
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-3 text-foreground"
                                        >
                                            <Home className="w-4 h-4 text-muted-foreground" />
                                            <span>My Profile</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/dashboard');
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-3 text-foreground"
                                        >
                                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                            <span>Dashboard</span>
                                        </button>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-border py-1">
                                        <button
                                            onClick={() => {
                                                onLogout?.();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-3"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {showMobileMenu && (
                    <div className="md:hidden border-t border-border bg-card rounded-b-2xl">
                        {/* Mobile specific nav could go here */}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
