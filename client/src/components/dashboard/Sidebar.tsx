import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar as ProSidebar, Menu, MenuItem } from 'react-pro-sidebar';
import {
  LayoutDashboard,
  Compass,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
  Megaphone,
  Book,
  CheckSquare,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import logo from '../../assets/peerspace-logo.png';

type UserRole = 'student' | 'instructor' | 'admin';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  badge?: number;
  roleRestriction?: UserRole[];
}

interface SidebarProps {
  onLogout: () => void;
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, path: '/announcements' },
  { id: 'resources', label: 'Resources', icon: FileText, path: '/resources' },
  { id: 'posts', label: 'Posts', icon: MessageSquare, path: '/posts' },
  { id: 'notes', label: 'Notes', icon: Book, path: '/notes' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', roleRestriction: ['student'] },
  { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare, path: '/feedbacks' },
];

const secondaryNavItems: NavItem[] = [
  { id: 'settings', label: 'Edit Profile', icon: Settings, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  // Fetch current user role to respect roleRestricted nav items
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        const role = (res.data.role || '').toLowerCase() as UserRole;
        if (mounted) setUserRole(role);
      } catch (err) {
        // unauthenticated or failed - treat as no role
        if (mounted) setUserRole(null);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };
    fetchUser();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (collapsed && sidebarContainerRef.current) {
      const container = sidebarContainerRef.current.querySelector('.ps-sidebar-container');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [collapsed]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const shouldShowItem = (item: NavItem) => {
    if (!item.roleRestriction) return true;
    // If user role is still loading, hide restricted items until resolved
    if (userLoading) return false;
    if (!userRole) return false;
    return item.roleRestriction.includes(userRole);
  };

  return (
    <div
      ref={sidebarContainerRef}
      className={`fixed left-0 top-0 h-screen z-50 shadow-xl transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <ProSidebar
        collapsed={collapsed}
        backgroundColor="var(--sidebar)"
        width="256px"
        collapsedWidth="80px"
        transitionDuration={300}
        rootStyles={{
          height: '100%',
          borderRight: 'none',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .ps-sidebar-container': {
            overflowY: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE and Edge
            '&::-webkit-scrollbar': {
              display: 'none', // Chrome, Safari, Opera
            },
          },
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border transition-all duration-300 ease-in-out">
          <div className="w-7 h-7 flex items-center justify-center shrink-0 rounded-md overflow-hidden transition-transform duration-300">
            <img
              src={logo}
              alt="PeerSpace"
              className="w-6 h-6 object-contain opacity-90"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />
          </div>
          <span
            className={`text-sidebar-foreground font-semibold text-base whitespace-nowrap ${collapsed ? 'opacity-0 invisible absolute' : 'opacity-100 visible relative transition-all duration-300 ease-in-out'
              }`}
          >
            PeerSpace
          </span>
        </div>

        {/* Main Navigation */}
        <Menu
          menuItemStyles={{
            button: ({ active }) => ({
              backgroundColor: active ? 'var(--sidebar-accent)' : 'transparent',
              color: active ? 'var(--sidebar-primary)' : 'var(--sidebar-foreground)',
              borderLeft: active ? '3px solid var(--sidebar-primary)' : '3px solid transparent',
              borderRadius: '0 8px 8px 0',
              padding: '10px 16px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              justifyContent: 'flex-start',
              transform: 'translateX(0) scale(1)',
              '&:hover': {
                backgroundColor: 'var(--sidebar-accent)',
                color: active ? 'var(--sidebar-primary)' : 'var(--sidebar-foreground)',
                transform: 'translateX(4px) scale(1.02)',
              },
            }),
            icon: ({ active }) => ({
              color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              minWidth: '20px',
              marginRight: '10px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }),
            label: {
              opacity: collapsed ? 0 : 1,
              visibility: collapsed ? 'hidden' : 'visible',
              whiteSpace: 'nowrap',
              transition: collapsed ? 'none' : 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: collapsed ? 'absolute' : 'relative',
              pointerEvents: collapsed ? 'none' : 'auto',
            },
          }}
        >
          {mainNavItems.filter(shouldShowItem).map((item) => {
            const Icon = item.icon;
            return (
              <MenuItem
                key={item.id}
                icon={<Icon size={20} />}
                active={isActive(item.path)}
                onClick={() => item.path && navigate(item.path)}
              >
                {item.label}
              </MenuItem>
            );
          })}

          {/* Divider */}
          <div className="my-4 mx-3 border-t border-border" />

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <MenuItem
                key={item.id}
                icon={<Icon size={20} />}
                active={isActive(item.path)}
                onClick={() => item.path && navigate(item.path)}
              >
                {item.label}
              </MenuItem>
            );
          })}
        </Menu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout Button */}
        <Menu
          menuItemStyles={{
            button: {
              backgroundColor: 'transparent',
              color: 'var(--sidebar-foreground)',
              borderRadius: '8px',
              margin: '4px 12px',
              padding: '10px 16px',
              justifyContent: 'flex-start',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateX(0) scale(1)',
              '&:hover': {
                backgroundColor: 'var(--sidebar-accent)',
                color: 'var(--sidebar-foreground)',
                transform: 'translateX(4px) scale(1.02)',
              },
            },
            icon: {
              color: 'var(--muted-foreground)',
              minWidth: '20px',
              marginRight: '10px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            label: {
              opacity: collapsed ? 0 : 1,
              visibility: collapsed ? 'hidden' : 'visible',
              whiteSpace: 'nowrap',
              transition: collapsed ? 'none' : 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: collapsed ? 'absolute' : 'relative',
              pointerEvents: collapsed ? 'none' : 'auto',
            },
          }}
        >
          <div className="border-t border-sidebar-border pt-4 pb-4">
            <MenuItem
              icon={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              onClick={toggleTheme}
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </MenuItem>
            <MenuItem icon={<LogOut size={20} />} onClick={onLogout}>
              Logout
            </MenuItem>
          </div>
        </Menu>
      </ProSidebar>
    </div>
  );
};

export default Sidebar;
