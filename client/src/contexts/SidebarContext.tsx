import React, { createContext, useContext, useState, useEffect} from 'react';
import type { ReactNode } from 'react';

interface SidebarContextType {
  sidebarWidth: number;
  isExpanded: boolean;
  isHovered: boolean;
  isMobile: boolean;
  setIsExpanded: (expanded: boolean) => void;
  setIsHovered: (hovered: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarWidth = isMobile 
    ? 0 // Mobile sidebar is overlay, doesn't take space
    : (isExpanded || isHovered ? 288 : 80); // 72 * 4 = 288px or 20 * 4 = 80px

  return (
    <SidebarContext.Provider value={{ sidebarWidth, isExpanded, isHovered, isMobile, setIsExpanded, setIsHovered }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

