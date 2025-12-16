import React from 'react';
import './BadgeButton.css';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

interface BadgeButtonProps {
  to?: string;
  className?: string;
}

const BadgeButton: React.FC<BadgeButtonProps> = ({ to = '/badges', className = '' }) => {
  const navigate = useNavigate();

  return (
    <div className={`relative inline-block ${className}`}>
      {/* glow behind the button */}
      <div className="absolute inset-0 -z-10 rounded-md badge-glow">
        <div className="w-full h-full rounded-md bg-linear-to-br from-turf-green-500 to-frosted-blue-500" />
      </div>

      <button
        onClick={() => navigate(to)}
        className={`relative inline-flex flex-col items-center justify-center px-3 py-2 rounded-md border border-border bg-linear-to-br from-turf-green-500 to-frosted-blue-500 text-white text-sm font-medium shadow-md transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frosted-blue-500 badge-button-shine cursor-pointer`}
      >
        <Star className="w-6 h-6 mb-1 text-white drop-shadow-lg" />
        <span>View Badges</span>
      </button>
    </div>
  );
};

export default BadgeButton;
