import { useEffect, useState } from 'react';
import socializerAvatar from '../avatars/impressed.png'
import partnerAvatar from '../avatars/happy.png';
import packageIcon from '../avatars/package.png';
import '../styles/TaskPage.css';

const TaskPage = () => {
  const [taskProgress, setTaskProgress] = useState(0);
  const [packetPos, setPacketPos] = useState(0);
  const [playerTurn, setPlayerTurn] = useState<'player' | 'partner'>('player');
  const [taskComplete, setTaskComplete] = useState(false);
  const [playerMessage, setPlayerMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (playerTurn === 'partner' && !taskComplete) {
      //Note: For Demo purposes this is automated
      const timer = setTimeout(() => {
        setTaskProgress(prev => Math.min(prev + 15, 100));
        setPacketPos(prev => Math.min(prev + 15, 100));
        setPlayerTurn('player');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [playerTurn, taskComplete]);

  useEffect(() => {
    if (taskProgress >= 100 && !taskComplete) {
      setTaskComplete(true);
      //Note: For Demo purposes this is automated
      setTimeout(() => {
        setMessages(prev => [...prev, 'Partner: Nice teamwork! :-)']);
      }, 2000);
    }
  }, [taskProgress, taskComplete]);

  const sendPacket = () => {
    if (playerTurn !== 'player' || taskComplete) return;
    setTaskProgress(prev => Math.min(prev + 15, 100));
    setPacketPos(prev => Math.min(prev + 15, 100));
    setPlayerTurn('partner');
  };

  const sendMessage = () => {
    if (!playerMessage.trim()) return;
    setMessages(prev => [...prev, `You: ${playerMessage}`]);
    setPlayerMessage('');
  };

  return (
    <div className="app task-page">
      <header className="app-header">
        <h1 className="press-start-2p-regular">Your task: Establish the first connection</h1>
        <p className="task-description">
          Send packets back and forth until your link is fully established.
        </p>
      </header>

      <main className="app-main task-main">
        <section className="task-section">
          <h2>Progress of your connection</h2>

          <div className="avatars-row">
            <div className="avatar-block">
              <img src={socializerAvatar} className="avatar-image large" />
              <p>You</p>
            </div>
            <div className="avatar-block">
              <img src={partnerAvatar} className="avatar-image large" />
              <p>Partner</p>
            </div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${taskProgress}%` }}></div>
            <span className="packet-icon" style={{ left: `${packetPos}%` }}>
              <img src={packageIcon} />
            </span>
          </div>

          {!taskComplete ? (
            <button
              onClick={sendPacket}
              className="role-card task-button"
              data-disabled={playerTurn !== 'player'}
            >
              {playerTurn === 'player' ? 'Send packet' : 'Waiting for partner...'}
            </button>
          ) : (
            <div className="task-complete-section">
              <p className="task-complete-text">
                Task complete! You and your partner successfully exchanged enough packets to
                establish a stable SDN connection.<br />
                In real networks, this means switches and controllers now trust each other and can
                forward traffic reliably.
              </p>

              <div className="messages-container">
                {messages.map((msg, i) => (
                  <p key={i} className="message">{msg}</p>
                ))}
              </div>

              <div className="send-message-row">
                <input
                  type="text"
                  value={playerMessage}
                  onChange={(e) => setPlayerMessage(e.target.value)}
                  placeholder="Send a message..."
                  className="message-input"
                />
                <button onClick={sendMessage} className="role-card send-button">
                  Send
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TaskPage;
