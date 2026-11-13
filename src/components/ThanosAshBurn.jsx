import React, { useEffect, useRef } from 'react';
import { playAshSnapSound } from '../utils/audio';

/**
 * Thanos Snap Ash Burn Disintegration Component
 * Renders an authentic ash disintegration effect where text and parchment dissolve 
 * into drifting ash, embers, and dust flakes (inspired by the Thanos snap).
 */
export default function ThanosAshBurn({ isBurning, onComplete, duration = 2400 }) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    if (!isBurning) return;

    // Trigger synthetic audio crackle & ash wind
    playAshSnapSound();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = (canvas.width = parent ? parent.clientWidth : 500);
    const height = (canvas.height = parent ? parent.clientHeight : 250);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();
    const particles = [];

    // Particle color palettes: Glowing embers, charred dark ash, and light grey soot
    const emberColors = ['#ff3b00', '#ff6b00', '#ffa600', '#ffdd00', '#ffffff'];
    const ashColors = ['#1c1917', '#292524', '#44403c', '#57534e', '#78716c', '#a8a29e'];

    const spawnParticlesAlongLine = (lineX) => {
      // Spawn 12-18 particles per frame along the burn line
      const count = Math.floor(Math.random() * 7) + 12;
      for (let i = 0; i < count; i++) {
        const isEmber = Math.random() < 0.35;
        const color = isEmber 
          ? emberColors[Math.floor(Math.random() * emberColors.length)]
          : ashColors[Math.floor(Math.random() * ashColors.length)];

        const size = isEmber ? Math.random() * 2.5 + 1 : Math.random() * 3.8 + 1.2;
        const y = Math.random() * height;

        particles.push({
          x: lineX + (Math.random() - 0.5) * 16,
          y: y,
          vx: (Math.random() * 2.2 + 0.6), // blow toward the right
          vy: -(Math.random() * 2.8 + 1.0), // thermal updraft upwards
          size: size,
          color: color,
          isEmber: isEmber,
          alpha: 1,
          decay: Math.random() * 0.016 + 0.007,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.25,
          wobbleSpeed: Math.random() * 0.1 + 0.05,
          wobbleOffset: Math.random() * 10
        });
      }
    };

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // Sweeping burn frontier from left to right (with slight angle offset)
      const sweepX = progress * (width + 60) - 20;

      // Spawn new particles while the sweep is crossing the canvas
      if (progress < 0.92) {
        spawnParticlesAlongLine(sweepX);
      }

      // Draw the glowing fiery burn frontier seam
      if (progress < 0.98) {
        const seamGradient = ctx.createLinearGradient(sweepX - 25, 0, sweepX + 15, 0);
        seamGradient.addColorStop(0, 'rgba(255, 60, 0, 0)');
        seamGradient.addColorStop(0.5, 'rgba(255, 120, 20, 0.65)');
        seamGradient.addColorStop(0.85, 'rgba(255, 220, 100, 0.95)');
        seamGradient.addColorStop(1, 'rgba(255, 60, 0, 0)');

        ctx.fillStyle = seamGradient;
        ctx.fillRect(sweepX - 25, 0, 40, height);

        // Bright ember highlight sparks on the burning edge
        for (let j = 0; j < 5; j++) {
          const sparkY = Math.random() * height;
          ctx.beginPath();
          ctx.arc(sweepX + (Math.random() - 0.5) * 6, sparkY, Math.random() * 2 + 1, 0, Math.PI * 2);
          ctx.fillStyle = '#fff7ed';
          ctx.shadowColor = '#ff6b00';
          ctx.shadowBlur = 10;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // Update & render all active ash & dust particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics: air resistance, wind, and turbulent flutter
        p.wobbleOffset += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobbleOffset) * 0.9;
        p.y += p.vy;
        p.vy -= 0.015; // upward heat buoyancy
        p.vx *= 0.985; // drag
        p.angle += p.angularSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y < -20 || p.x > width + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.isEmber) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Irregular ash flake shape (Thanos dust effect)
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size * (0.8 + Math.sin(p.wobbleOffset) * 0.4));
          ctx.fill();
        }

        ctx.restore();
      }

      if (progress < 1 || particles.length > 0) {
        animFrameId.current = requestAnimationFrame(render);
      } else {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isBurning, duration, onComplete]);

  if (!isBurning) return null;

  return (
    <div className="thanos-ash-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="thanos-ash-canvas" />
    </div>
  );
}
