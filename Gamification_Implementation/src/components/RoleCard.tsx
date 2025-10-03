import type { Role } from '../types';
import RoleStatBar from './RoleStatBar';
import '../styles/RoleCard.css'

interface RoleCardProps {
  role: Role;
  isSelected: boolean;
  onSelect: (role: Role) => void;
}

const RoleCard = ({ role, isSelected, onSelect }: RoleCardProps) => {

  const getRoleStats = (roleName: string) => {
    const name = roleName.toLowerCase();

    if (name.includes('socialiser')) {
      return { COL: 95, CRE: 60, MOT: 70, STR: 55 };
    }
    if (name.includes('free spirit')) {
      return { COL: 65, CRE: 95, MOT: 70, STR: 60 };
    }
    if (name.includes('achiever')) {
      return { COL: 70, CRE: 55, MOT: 95, STR: 80 };
    }
    if (name.includes('philanthropist')) {
      return { COL: 90, CRE: 70, MOT: 85, STR: 65 };
    }
    if (name.includes('disruptor')) {
      return { COL: 50, CRE: 95, MOT: 80, STR: 75 };
    }
    if (name.includes('player')) {
      return { COL: 70, CRE: 60, MOT: 85, STR: 80 };
    }
  };

  const roleStats = getRoleStats(role.name)!;

  return (
    <div
      className={`role-card ${isSelected ? 'selected' : ''}`}
      style={{ borderColor: isSelected ? '#6bd1ff' : undefined }}
      onClick={() => onSelect(role)}
    >
      <div className="role-header">
        <h3 style={{ color: '#6bd1ff' }}>{role.name}</h3>
      </div>
      <p className="role-description">{role.description}</p>

      <div className="role-stats-container">
        <h5 className="role-stats-title">
          Base stats
        </h5>
        {/* 
        Collaboration (COL): working with others, communication.
        Creativity (CRE): exploring, self-expression.
        Motivation (MOT): persistence, drive to finish.
        Strategy (STR): problem-solving, planning.
        */}
        <RoleStatBar label="COL" value={roleStats.COL} color="#ff6b6b" />
        <RoleStatBar label="CRE" value={roleStats.CRE} color="#4ecdc4" />
        <RoleStatBar label="MOT" value={roleStats.MOT} color="#4f8fd1" />
        <RoleStatBar label="STR" value={roleStats.STR} color="#ffb347" />
      </div>
    </div>
  );
};

export default RoleCard;