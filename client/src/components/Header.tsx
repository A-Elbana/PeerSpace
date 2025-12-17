import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search, X, Menu, MessageSquare, TrendingUp, Users } from 'lucide-react';
import NotificationContext from '../contexts/NotificationContext';
import { useResolvedFileUrl } from '../hooks/useResolvedFileUrl';
import { useSidebar } from '../contexts/SidebarContext';

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
                className="shrink-0 rounded-full bg-linear-to-br from-frosted-blue-500 to-turf-green-500 text-white font-semibold flex items-center justify-center overflow-hidden"
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
    isSearching?: boolean;
    unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
    user, 
    onLogout, 
    searchValue, 
    onSearchChange, 
    searchedPosts = [], 
    searchedCommunities = [], 
    isSearching,
    unreadCount = 0,
}) => {
    const navigate = useNavigate();
    const { sidebarWidth } = useSidebar();
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
            // don't await here, just trigger
            ctx.fetchNotifications().catch(() => {});
        }
    }, [ctx]);

    // Close menus when clicking outside
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

    // Focus search when user presses '/'
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

    const showSearchResults = isFocused && searchValue && (searchedPosts?.length > 0 || searchedCommunities?.length > 0 || isSearching);

    return (
        <header 
            className="sticky top-0 z-30 w-full px-3 sm:px-4 lg:pr-4 bg-transparent transition-all duration-300"
            style={{ paddingLeft: `${sidebarWidth + 16}px` }}
        >
            <div className="max-w-6xl mx-auto w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm px-4 sm:px-6">
                <div className="flex items-center justify-between h-12 sm:h-14 gap-2 sm:gap-4">
                    {/* Left Section - Logo & Nav */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {/* Mobile Menu Toggle */}
                        <button 
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Logo */}
                        <button 
                            onClick={() => navigate('/')} 
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-frosted-blue-500 to-turf-green-500 flex items-center justify-center text-white font-bold text-sm">
                                PS
                            </div>
                            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-frosted-blue-600 to-turf-green-600 bg-clip-text text-transparent">
                                PeerSpace
                            </span>
                        </button>
                    </div>

                    {/* Center Section - Search */}
                    <div className="flex-1 max-w-2xl" ref={searchRef}>
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                                    className="w-full h-9 sm:h-10 pl-10 pr-10 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm placeholder-gray-500 focus:outline-none focus:border-frosted-blue-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
                                />
                                {searchValue && (
                                    <button 
                                        onClick={() => {
                                            onSearchChange?.('');
                                            setIsFocused(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <X className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {showSearchResults && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
                                    {isSearching && (
                                        <div className="px-4 py-8 text-center text-gray-500">
                                            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-frosted-blue-500 rounded-full animate-spin"></div>
                                            <p className="mt-2 text-sm">Searching...</p>
                                        </div>
                                    )}

                                    {!isSearching && searchedPosts.length === 0 && searchedCommunities.length === 0 && (
                                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No results found for "{searchValue}"
                                        </div>
                                    )}

                                    {searchedCommunities && searchedCommunities.length > 0 && (
                                        <div className="border-b border-gray-200 dark:border-gray-800">
                                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Communities
                                            </div>
                                            {searchedCommunities.map((comm: any) => (
                                                <button
                                                    key={comm.id}
                                                    onClick={() => {
                                                        navigate(`/community/${comm.id}`);
                                                        setIsFocused(false);
                                                    }}
                                                    className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                                >
                                                    <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 text-left">
                                                        <div className="font-medium text-sm truncate">{comm.name}</div>
                                                        {comm.description && (
                                                            <div className="text-xs text-gray-500 truncate">{comm.description}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchedPosts && searchedPosts.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Posts
                                            </div>
                                            {searchedPosts.map((post: any) => (
                                                <button
                                                    key={post.id}
                                                    onClick={() => {
                                                        navigate(`/community/${post.cid}/post/${post.id}`);
                                                        setIsFocused(false);
                                                    }}
                                                    className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-start gap-3"
                                                >
                                                    <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 text-left">
                                                        <div className="font-medium text-sm line-clamp-2">{post.title}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
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
                            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5" />
                            {effectiveUnread > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-[11px] font-semibold rounded-full bg-red-600 text-white">
                                    {effectiveUnread > 99 ? '99+' : effectiveUnread}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Avatar user={user ?? undefined} size={32} />
                            </button>

                            {/* User Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <Avatar user={user ?? undefined} size={40} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate">
                                                    {user?.fname} {user?.lname}
                                                </div>
                                                <div className="text-xs text-gray-500">View Profile</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-2">
                                        <button
                                            onClick={() => {
                                                navigate(user?.id ? `/profile/${user.id}` : '/profile');
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                        >
                                            <Home className="w-4 h-4 text-gray-500" />
                                            <span>My Profile</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/dashboard');
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                        >
                                            <TrendingUp className="w-4 h-4 text-gray-500" />
                                            <span>Dashboard</span>
                                        </button>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-gray-200 dark:border-gray-800 py-2">
                                        <button
                                            onClick={() => {
                                                onLogout?.();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
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
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;