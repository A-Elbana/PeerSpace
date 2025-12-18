import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

interface BadgeButtonProps {
  to?: string;
  className?: string;
}

const BadgeButton: React.FC<BadgeButtonProps> = ({ to = '/badges', className = '' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-turf-green-500 to-frosted-blue-500 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frosted-blue-500 overflow-hidden ${className}`}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
      
      <Star className="h-4 w-4 relative z-10 group-hover:rotate-12 transition-transform duration-200" />
      <span className="text-sm relative z-10">View Badges</span>
    </button>
  );
};

export default BadgeButton;
