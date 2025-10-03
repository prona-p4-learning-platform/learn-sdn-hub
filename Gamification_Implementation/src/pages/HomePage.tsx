import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socializerAvatar from '../avatars/impressed.png';
import '../styles/HomePage.css'

interface Socializer {
  id: number;
  name: string;
}

const otherSocializers: Socializer[] = [
  { id: 1, name: 'Kai' },
  { id: 2, name: 'Luna' },
];

const HomePage = () => {
  const [coopPopupOpen, setCoopPopupOpen] = useState(false);
  const [connectedPartner, setConnectedPartner] = useState<Socializer | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [partnerAccepted, setPartnerAccepted] = useState(false);

  const navigate = useNavigate();

  const userRole = {
    name: 'Socializer',
    level: 1,
    xp: 33,
    xpGoal: 100,
    description: 'You thrive on building connections and completing cooperative tasks!',
  };

  const startTask = () => {
    setCoopPopupOpen(true);
  };

  const selectPartner = (partner: Socializer) => {
    setConnectedPartner(partner);
    setWaitingForPartner(true);
    setCoopPopupOpen(false);

    //Note: For Demo purposes this is automated
    setTimeout(() => {
      setPartnerAccepted(true);
      setWaitingForPartner(false);
    }, 5000);
  };

  return (
    <div className="app">
      <div className="homepage-container">
        <aside className="homepage-sidebar">
          <section>
            <div className="avatar-container">
              <img
                src={socializerAvatar}
                className="avatar-image large"
              />
            </div>
            <h2 className="role-title">{userRole.name}</h2>
            <p className="role-description">{userRole.description}</p>

            <div className="level-bar-wrapper">
              <div className="level-text">Level {userRole.level}</div>
              <div className="level-bar-container">
                <div
                  className="level-bar-fill"
                  style={{ width: `${(userRole.xp / userRole.xpGoal) * 100}%` }}
                />
              </div>
              <div className="xp-text">{userRole.xp} / {userRole.xpGoal} XP</div>
            </div>

            <nav className="sidebar-buttons">
              <button className="profile-button">Achievements</button>
              <button className="profile-button">Logout</button>
            </nav>
          </section>
        </aside>

        <main className="homepage-main">
          <section>
            <h2>Beginner task</h2>
            <p className="task-description">
              In <strong>Software-Defined Networking (SDN)</strong>, devices do not work alone,
              they rely on a central controller to guide their packets to the right destination.
              <br /><br />
              As a <strong>Socializer</strong>, your strength is cooperation. You and your partner
              will simulate how two devices can work together to establish a reliable connection.
              No prior SDN knowledge needed, just teamwork!
            </p>

            {!connectedPartner && (
              <button className="role-card start-coop-btn" onClick={startTask}>
                Start Co-op
              </button>
            )}

            {waitingForPartner && connectedPartner && (
              <p className="waiting-text">
                Waiting for {connectedPartner.name} to accept co-op...
              </p>
            )}

            {partnerAccepted && connectedPartner && (
              <button
                className="role-card start-task-btn"
                onClick={() => navigate('/task')}
              >
                Start task with {connectedPartner.name}
              </button>
            )}
          </section>

          <section className="first-task-card">
            Complete your first task to unlock more adventures...
          </section>
        </main>
      </div>

      {coopPopupOpen && (
        <div className="coop-popup">
          <div className="coop-popup-content">
            <h3>Choose a Co-op partner</h3>
            <div className="coop-user-list">
              {otherSocializers.map((user) => (
                <div key={user.id} className="coop-user-card role-card" onClick={() => selectPartner(user)}>
                  <span>{user.name}</span>
                  <strong className="add-user">+</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
