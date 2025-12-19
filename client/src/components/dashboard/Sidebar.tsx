import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Sun, Moon, Menu, X, ChevronRight } from 'lucide-react';
import { mainNavItems, secondaryNavItems } from './nav';
import type { NavItem, UserRole } from './nav';
import { useTheme } from '../../hooks/useTheme';
import { useSidebar } from '../../contexts/SidebarContext';
import api from '../../services/api';
import logo from '../../assets/peerspace-logo.png';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isExpanded, isHovered, isMobile, setIsExpanded, setIsHovered } = useSidebar();

  // Fetch current user role to respect roleRestricted nav items
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Track actual sidebar width for toggle button positioning
  const sidebarWidth = isMobile
    ? (isMobileOpen ? 288 : 0)
    : (isExpanded || isHovered ? 288 : 80);


  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        const role = (res.data.role || '').toLowerCase() as UserRole;
        if (mounted) setUserRole(role);
      } catch (err) {
        if (mounted) setUserRole(null);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };
    fetchUser();
    return () => { mounted = false; };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (isMobile && isMobileOpen) {
          setIsMobileOpen(false);
        }
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, isMobile]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const shouldShowItem = (item: NavItem) => {
    if (!item.roleRestriction) return true;
    if (userLoading) return false;
    if (!userRole) return false;
    return item.roleRestriction.includes(userRole);
  };

  const handleNavClick = (path?: string) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        setIsMobileOpen(false);
      }
    }
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const showLabel = isMobile || isExpanded || isHovered;

    return (
      <button
        onClick={() => handleNavClick(item.path)}
        className={`
          group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl
          transition-all duration-300 ease-out
          ${active
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }
          ${!showLabel && 'justify-center'}
        `}
        title={!showLabel ? item.label : undefined}
      >
        <div className={`
          flex items-center justify-center shrink-0
          ${active ? 'text-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'}
          transition-colors duration-200
        `}>
          <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span
          className={`
            font-medium text-sm whitespace-nowrap
            transition-all duration-300 ease-out
            ${showLabel
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-2 absolute pointer-events-none'
            }
          `}
        >
          {item.label}
        </span>
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
        )}
        {showLabel && active && (
          <ChevronRight
            size={16}
            className="ml-auto text-primary opacity-60"
          />
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-primary to-chart-2 p-2 shadow-lg shadow-primary/20">
          <img
            src={logo}
            alt="PeerSpace"
            className="w-full h-full object-contain"
            style={{ filter: isDarkMode ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
          />
        </div>
        <div
          className={`
            transition-all duration-300 ease-out overflow-hidden
            ${(isMobile || isExpanded || isHovered)
              ? 'opacity-100 max-w-[200px]'
              : 'opacity-0 max-w-0'
            }
          `}
        >
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-chart-2 whitespace-nowrap">
            PeerSpace
          </h2>
          <p className="text-xs text-muted-foreground">Learning Platform</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
        <div className="space-y-1">
          {mainNavItems.filter(shouldShowItem).map((item: NavItem) => (
            <NavItemComponent key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-sidebar-border pt-2 pb-4 px-3 space-y-1">
        {secondaryNavItems.map((item: NavItem) => (
          <NavItemComponent key={item.id} item={item} />
        ))}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`
            group w-full flex items-center gap-3 px-4 py-3 rounded-xl
            text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
            transition-all duration-300 ease-out
            ${(isMobile || isExpanded || isHovered) ? 'justify-start' : 'justify-center'}
          `}
          title={!isMobile && !isExpanded && !isHovered ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          <div className="flex items-center justify-center shrink-0 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors duration-200">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          {(isMobile || isExpanded || isHovered) && (
            <span className="font-medium text-sm whitespace-nowrap">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`
            group w-full flex items-center gap-3 px-4 py-3 rounded-xl
            text-destructive hover:bg-destructive/10 hover:text-destructive
            transition-all duration-300 ease-out
            ${(isMobile || isExpanded || isHovered) ? 'justify-start' : 'justify-center'}
          `}
          title={!isMobile && !isExpanded && !isHovered ? 'Logout' : undefined}
        >
          <div className="flex items-center justify-center shrink-0 transition-colors duration-200">
            <LogOut size={20} />
          </div>
          {(isMobile || isExpanded || isHovered) && (
            <span className="font-medium text-sm whitespace-nowrap">Logout</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-xl bg-card border border-border shadow-lg hover:bg-accent transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <X size={24} className="text-foreground" />
          ) : (
            <Menu size={24} className="text-foreground" />
          )}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed left-0 top-0 h-screen z-50
          bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-out
          ${isMobile
            ? `${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-72`
            : `${isExpanded || isHovered ? 'w-72' : 'w-20'}`
          }
          shadow-xl shadow-black/10 dark:shadow-black/50
        `}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Expand Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            fixed z-[55]
            p-2.5 rounded-full
            bg-primary text-primary-foreground
            shadow-lg shadow-primary/30
            hover:scale-110 active:scale-95
            transition-all duration-300 ease-out
            bottom-4
          `}
          style={{
            left: `${sidebarWidth + 16}px`,
          }}
          aria-label={isExpanded || isHovered ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isExpanded || isHovered ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronRight
            size={18}
            className={`transition-transform duration-300 ${(isExpanded || isHovered) ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </>
  );
};

export default Sidebar;
