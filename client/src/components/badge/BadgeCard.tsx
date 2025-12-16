import React from 'react';
import './BadgeCard.css';

interface BadgeCardProps {
  title: string;
  description?: string | null;
  imageUrl?: string;
  earned?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ title, description, imageUrl, earned = false }) => {
  return (
    <div className="badge-card">
      <div className="badge-card__glow" aria-hidden />
      <div className="badge-card__body">
        <div className="badge-card__image-wrap">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="badge-card__image" />
          ) : (
            <div className="badge-card__placeholder">✨</div>
          )}
        </div>
        <div className="badge-card__content">
          <div className="badge-card__title">{title}</div>
          <div className="badge-card__description">{description || 'Earn this badge to showcase your achievement.'}</div>
          {earned && <div className="badge-card__earned">Unlocked</div>}
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;