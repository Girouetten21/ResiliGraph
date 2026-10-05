import React, { useState, useEffect } from 'react';
import { ResiliLogo } from './ResiliLogo';

interface AppLoaderProps {
  onFinish?: () => void;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Smooth progress increment
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const jump = Math.floor(Math.random() * 12) + 8;
        return Math.min(100, prev + jump);
      });
    }, 90);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 300);

      const unmountTimer = setTimeout(() => {
        setIsMounted(false);
        if (onFinish) onFinish();
      }, 900);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [progress, onFinish]);

  if (!isMounted) return null;

  return (
    <div className={`app-loader-overlay ${isExiting ? 'loader-exiting' : ''}`}>
      {/* Background Animated Distributed Grid & Light Blobs */}
      <div className="loader-ambient-grid" />
      <div className="loader-glow-orb orb-primary" />
      <div className="loader-glow-orb orb-secondary" />

      {/* Floating Network Constellation Nodes */}
      <div className="loader-network-visual">
        <div className="net-node node-1" />
        <div className="net-node node-2" />
        <div className="net-node node-3" />
        <div className="net-node node-4" />
      </div>

      {/* Clean & Minimalist Floating Imagotipo Loader */}
      <div className="loader-content-wrap">
        {/* Imagotipo: Logo Left + Brand Right */}
        <div className="loader-imagotipo">
          <div className="loader-logo-wrapper">
            <div className="logo-energy-pulse" />
            <ResiliLogo size={96} withGlow={true} />
          </div>

          <div className="loader-brand-text">
            <h1 className="loader-brand-name">
              Resili<span className="text-gradient-cyan">Graph</span>
            </h1>
            <p className="loader-tagline">
              Distributed Architecture & Chaos Simulator
            </p>
          </div>
        </div>

        {/* Minimalist Glowing Progress Line */}
        <div className="loader-minimal-progress">
          <div className="loader-progress-track">
            <div
              className="loader-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="loader-progress-status">
            <span className="status-label">
              {progress < 35 ? 'Initializing distributed simulation matrix...' :
               progress < 70 ? 'Connecting cross-region mesh topology...' :
               progress < 100 ? 'Calibrating 60 FPS physics engine...' : 'Simulation Engine Ready'}
            </span>
            <span className="status-percent">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
