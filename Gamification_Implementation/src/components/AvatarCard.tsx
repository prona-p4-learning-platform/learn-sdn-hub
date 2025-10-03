import type { Avatar } from '../types';
import '../styles/AvatarCard.css';

interface AvatarCardProps {
  avatar: Avatar;
  isSelected: boolean;
  onSelect: (avatar: Avatar) => void;
}

const AvatarCard = ({ avatar, isSelected, onSelect }: AvatarCardProps) => {
  return (
    <div
      className={`avatar-card ${isSelected ? 'selected' : ''}`}
      style={{ borderColor: isSelected ? '#6bd1ff' : undefined }}
      onClick={() => onSelect(avatar)}
    >
      <div className="avatar-image-container">
        {avatar.imageUrl && (
          <div className="avatar-image avatar-image-extra">
            <img className='avatar-image-size'
              src={avatar.imageUrl}
              alt={avatar.name}
            />
          </div>
        )}
      </div>

      <div className="avatar-info">
        <h4 style={{ color: '#6bd1ff' }}>
          {avatar.name}
        </h4>
        <p>{avatar.description}</p>
      </div>
    </div>
  );
};

export default AvatarCard;
