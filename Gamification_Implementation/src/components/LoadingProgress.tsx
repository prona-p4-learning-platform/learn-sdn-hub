import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userImg from '../avatars/impressed.png';
import '../styles/LoadingProgress.css';

const LoadingProgress = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    //Note: For Demo purposes this is automated
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.floor(Math.random() * 10) + 5, 100);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate('/home'), 500);
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="loading-popup">
      <h4 className="loading-text">
        Loading...
      </h4>

      <div className="loading-bar-container">
        <div className="loading-bar" style={{ width: `${progress}%` }}></div>
        <img
          src={userImg}
          className="user-icon"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      <p>
        {progress < 100 ? `${progress}%` : 'Finished, have fun on your journey!'}
      </p>
    </div>
  );
};

export default LoadingProgress;
