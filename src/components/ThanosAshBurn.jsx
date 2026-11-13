import React, { useEffect, useRef } from 'react';
import { playAshSnapSound } from '../utils/audio';

/**
 * Thanos Snap Ash Burn Disintegration Engine
 * Produces an authentic, cinematic ash disintegration effect where an entire modal card
 * or container dissolves into swirling ash, glowing embers, and dust (inspired by the Thanos snap).
 */
export default function ThanosAshBurn({ 
  isBurning, 
  onComplete, 
  duration = 2600,
  isFullCard = true 
}) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    if (!isBurning) return;

    // Trigger synthetic audio combustion whoosh & crackling ash wind
    playAshSnapSound();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 560, height: 480 };
    
    // Support high DPI / Retina displays for sharp ash flakes
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const startTime = performance.now();
    const particles = [];

    // Particle color palettes:
    // 1. Incandescent embers: burning orange, fiery gold, white-hot spark
    const emberColors = ['#ff2a00', '#ff5a00', '#ff9400', '#ffc700', '#ffffff', '#fed7aa'];
    // 2. Cooling charcoal flakes: deep black, charred grey, burnt slate
    const charcoalColors = ['#0c0a09', '#1c1917', '#292524', '#3f3f46', '#52525b', '#71717a'];
    // 3. Fine ash dust: light smoke grey
    const dustColors = ['#a1a1aa', '#cbd5e1', '#e2e8f0', '#78716c'];

    const spawnRate = isFullCard ? 28 : 16;

    const spawnParticlesAlongLine = (lineX) => {
      const count = Math.floor(Math.random() * 8) + spawnRate;
      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let color, size, type, isEmber;

        if (rand < 0.32) {
          // Hot glowing spark / ember
          isEmber = true;
          type = 'ember';
          color = emberColors[Math.floor(Math.random() * emberColors.length)];
          size = Math.random() * 2.8 + 1.2;
        } else if (rand < 0.78) {
          // Charred paper ash flake
          isEmber = false;
          type = 'flake';
          color = charcoalColors[Math.floor(Math.random() * charcoalColors.length)];
          size = Math.random() * 4.5 + 1.8;
        } else {
          // Fine powder dust speck
          isEmber = false;
          type = 'dust';
          color = dustColors[Math.floor(Math.random() * dustColors.length)];
          size = Math.random() * 1.8 + 0.8;
        }

        const y = Math.random() * height;

        particles.push({
          x: lineX + (Math.random() - 0.5) * 20,
          y: y,
          // Forward drift with natural chaotic air turbulence
          vx: (Math.random() * 2.8 + 0.8), 
          // Upward buoyant draft (hot air lifts ash)
          vy: -(Math.random() * 3.4 + 1.2), 
          size: size,
          color: color,
          type: type,
          isEmber: isEmber,
          alpha: 1,
          decay: Math.random() * 0.014 + 0.006,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.3,
          wobbleSpeed: Math.random() * 0.12 + 0.04,
          wobbleOffset: Math.random() * 10,
          // Shape variability for realistic ash disintegration
          aspect: Math.random() * 0.6 + 0.7
        });
      }
    };

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // Sweeping burn line from left to right
      const sweepX = progress * (width + 80) - 30;

      // Spawn ash particles as the burning edge sweeps across the card
      if (progress < 0.94) {
        spawnParticlesAlongLine(sweepX);
      }

      // Draw the fiery incandescent burning seam along the sweep line
      if (progress < 0.98) {
        const seamWidth = 50;
        const seamGradient = ctx.createLinearGradient(sweepX - 35, 0, sweepX + 15, 0);
        seamGradient.addColorStop(0, 'rgba(255, 40, 0, 0)');
        seamGradient.addColorStop(0.35, 'rgba(255, 90, 10, 0.45)');
        seamGradient.addColorStop(0.7, 'rgba(255, 160, 20, 0.85)');
        seamGradient.addColorStop(0.9, 'rgba(255, 240, 150, 0.98)'); // incandescent white-hot edge
        seamGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = seamGradient;
        ctx.fillRect(sweepX - 35, 0, seamWidth, height);

        // Bright popping sparks directly on the burning line
        const sparkCount = Math.floor(Math.random() * 4) + 3;
        for (let j = 0; j < sparkCount; j++) {
          const sparkY = Math.random() * height;
          ctx.beginPath();
          ctx.arc(sweepX + (Math.random() - 0.5) * 10, sparkY, Math.random() * 2.2 + 1, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ff6b00';
          ctx.shadowBlur = 12;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // Update & render all active flying ash, charcoal flakes, and embers
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Atmospheric aerodynamic flutter & thermal updraft
        p.wobbleOffset += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobbleOffset) * 1.1;
        p.y += p.vy;
        p.vy -= 0.02; // continuous heat buoyancy
        p.vx *= 0.982; // air drag
        p.angle += p.angularSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y < -40 || p.x > width + 80) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.isEmber) {
          // Glowing hot ember
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'flake') {
          // Charred paper flake tumbling in 3D air
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.rect(
            -p.size / 2, 
            -p.size / 2, 
            p.size, 
            p.size * p.aspect * (0.7 + Math.sin(p.wobbleOffset) * 0.4)
          );
          ctx.fill();
        } else {
          // Fine powder dust
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
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
  }, [isBurning, duration, isFullCard, onComplete]);

  if (!isBurning) return null;

  return (
    <div className="thanos-card-ash-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="thanos-card-ash-canvas" />
    </div>
  );
}
