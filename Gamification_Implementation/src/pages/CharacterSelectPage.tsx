import { useState } from 'react';
import '../styles/CharacterSelectPage.css'
import RoleCard from '../components/RoleCard';
import AvatarCard from '../components/AvatarCard';
import LoadingProgress from '../components/LoadingProgress';
import { roles, avatars } from '../data/dummyData';
import type { Role, Avatar } from '../types';


const CharacterSelectPage = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(false);

  const roleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const avatarSelect = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
  };

  return (
    <div className="app">
      <header className="character-select-header">
        <h1 className="press-start-2p-regular">Into the SDNverse</h1>
        <p className="press-start-2p-regular">Character Creator</p>
      </header>

      <main className="character-select-main">
        <section className="roles-section">
          <h2>Select your role:</h2>
          <div className="roles-grid">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isSelected={selectedRole?.id === role.id}
                onSelect={roleSelect}
              />
            ))}
          </div>
        </section>

        {selectedRole && (
          <section className="avatars-section">
            <h2>Select your avatar:</h2>
            <div className="avatars-grid">
              {avatars.map((avatar) => (
                <AvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  isSelected={selectedAvatar?.id === avatar.id}
                  onSelect={avatarSelect}
                />
              ))}
            </div>
          </section>
        )}

        {selectedAvatar && !loading && (
          <div className="start-journey-container">
            <button
              onClick={() => setLoading(true)}
              className="press-start-2p-regular start-journey-btn"
            >
              Start your journey!
            </button>
          </div>
        )}

        {loading && <LoadingProgress />}

      </main>
    </div>
  );
}

export default CharacterSelectPage;