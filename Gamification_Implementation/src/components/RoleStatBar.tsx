import '../styles/RoleStatBar.css';

interface StatPreviewProps {
  label: string;
  value: number;
  color: string;
}

const RoleStatBar = ({ label, value, color }: StatPreviewProps) => {
  return (
    <div className="role-stat-bar">
      <span className="role-stat-label">{label}:</span>
      <div className="role-stat-track">
        <div className="role-stat-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="role-stat-value">{value}</span>
    </div>
  );
};

export default RoleStatBar;