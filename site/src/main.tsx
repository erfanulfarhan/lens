import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Motion does not consult prefers-reduced-motion on its own. With "user"
        it drops transform animations for anyone who has asked for less movement
        and cross-fades instead, so the page still arrives without sliding. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
