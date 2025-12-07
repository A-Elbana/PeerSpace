/**
 * Animated Border Component
 * Creates interactive gradient borders that respond to mouse movement
 */

import React from 'react';
import { motion } from 'framer-motion';
import './AnimatedBorder.css';

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  isDarkMode?: boolean;
}

/**
 * AnimatedBorder Component
 * Wraps content with an animated gradient border that responds to mouse movement
 */
export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  children,
  className = '',
  isDarkMode = false,
}) => {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: -100, y: -100 });
  };

  return (
    <motion.div
      ref={containerRef}
      className={`animated-border-container ${isDarkMode ? 'dark-mode' : 'light-mode'} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--border-light-x': `${mousePosition.x}px`,
        '--border-light-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {/* Animated border gradient */}
      <div className="animated-border-glow" />
      {/* Content */}
      <div className="animated-border-content">{children}</div>
    </motion.div>
  );
};

export default AnimatedBorder;
