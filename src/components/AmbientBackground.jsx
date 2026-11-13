import React, { useEffect, useRef } from 'react';

function AmbientBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Responsive particle count: lighter on mobile GPUs (Mali-G68) to preserve 90fps scrolling
    const isMobile = width < 768;
    const maxParticles = isMobile ? 28 : 65;
    const particleCount = Math.min(Math.floor((width * height) / 22000), maxParticles);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.5,
        speedX: (Math.random() - 0.5) * 0.22,
        speedY: -Math.random() * 0.32 - 0.08, // gently drifting upwards like embers
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        color: Math.random() > 0.6 ? '#fc2904' : Math.random() > 0.3 ? '#818cf8' : '#fbbf24'
      });
    }

    let lastTime = performance.now();
    let isScrolling = false;
    let scrollTimeout = null;

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    let frameSkip = false;

    const render = (now) => {
      // During high-velocity mobile scrolling, yield alternate frames to give the compositor 100% bandwidth
      if (isScrolling) {
        frameSkip = !frameSkip;
        if (frameSkip) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }
      }

      const dt = Math.min(50, now - lastTime) / 16.67; // Normalized frame delta (~1.0 at 60fps, ~0.67 at 90fps)
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY * dt;
        p.x += p.speedX * dt;
        p.alpha += Math.sin(now * p.pulseSpeed) * 0.005 * dt;

        // Wrap around
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = Math.max(0.1, Math.min(0.8, p.alpha));

        // Soft ambient glow halo (hardware accelerated without state-machine save/restore overhead)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha * 0.3;
        ctx.fill();

        // Core bright ember
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 ambient-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

export default React.memo(AmbientBackground);
