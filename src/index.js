import React from 'react';
import { createRoot } from 'react-dom/client';
import FraudScanner from './components/FraudScanner';

// Warp effect component
// Update the WarpEffect component
const WarpEffect = () => {
  React.useEffect(() => {
    const warpContainer = document.createElement('div');
    warpContainer.className = 'warp-container';
    
    const warp = document.createElement('div');
    warp.className = 'warp';
    warpContainer.appendChild(warp);
    document.body.appendChild(warpContainer);

    const moveWarp = (e) => {
      const { clientX, clientY } = e;
      requestAnimationFrame(() => {
        warp.style.left = `${clientX}px`;
        warp.style.top = `${clientY}px`;
        
        // Add distortion effect to grid
        document.body.style.setProperty('--mouse-x', `${clientX}px`);
        document.body.style.setProperty('--mouse-y', `${clientY}px`);
      });
    };

    window.addEventListener('mousemove', moveWarp);

    return () => {
      window.removeEventListener('mousemove', moveWarp);
      document.body.removeChild(warpContainer);
    };
  }, []);

  return null;
};

const App = () => (
  <React.StrictMode>
    <WarpEffect />
    <FraudScanner />
  </React.StrictMode>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);