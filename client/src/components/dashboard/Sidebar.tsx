import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  FileText,
  MessageSquare,
  Settings,
  Bookmark,
  Users,
  HelpCircle,
  LogOut
} from 'lucide-react';
import logo from '../../assets/peerspace-logo.png';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  badge?: number;
}

interface SidebarProps {
  onLogout: () => void;
}

const mainNavItems: NavItem[] = [
  { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  { id: 'announcements', label: 'Announcements', icon: LayoutDashboard, path: '/announcements' },
  { id: 'resources', label: 'Resources', icon: FileText, path: '/resources' },
  { id: 'posts', label: 'Posts', icon: MessageSquare, path: '/posts' },
  { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare, path: '/feedbacks' },
];

const secondaryNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, path: '/bookmarks' },
  { id: 'teams', label: 'Teams', icon: Users, path: '/teams' },
  { id: 'tutorials', label: 'Tutorials', icon: HelpCircle, path: '/tutorials' },
];

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const NavButton: React.FC<{ item: NavItem }> = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <button
        onClick={() => item.path && navigate(item.path)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200 group
          ${active
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        <Icon size={20} className={active ? 'text-frosted-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto bg-frosted-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1a1f2e] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <img src={logo} alt="PeerSpace" className="w-8 h-8" />
        <span className="text-white font-semibold text-lg">PeerSpace</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-white/10" />

        {secondaryNavItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
            text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
