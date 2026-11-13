import React, { useEffect, useRef, useState } from 'react';
import { playAshSnapSound } from '../utils/audio';

/**
 * Thanos Snap Ash Burn Disintegration Engine (Fully Responsive)
 * 
 * Delivers a cinematic letter-burning disintegration animation across Desktop and Mobile:
 * 1. Ignition & Catching Fire: Glowing red/orange edges (#FC2904, #FF704F) around the card perimeter.
 * 2. Charring & Darkening: Paper darkening into realistic charcoal carbon with SVG heat distortion.
 * 3. Responsive Particle Streaming:
 *    - Continuous stream of particles along the active sweeping burn front across the entire width.
 *    - Adaptive canvas sizing matching device viewport without causing horizontal mobile scroll or overflow.
 * 4. Multi-tier Particle Physics:
 *    - Upward-floating ash flakes (irregular 3D-tumbling charred polygons with buoyant lift and aerodynamic flutter)
 *    - Drifting fine dust (subtle micro-specks dispersing naturally)
 *    - Glowing embers (#FC2904, #FF704F, warm gold, incandescent white) that flicker and cool
 *    - Expanding subtle smoke wisps drifting upward
 * 5. Smooth Dissolution: Seamless fade into darkness transitioning to the ashes state.
 * 
 * Respects prefers-reduced-motion, scales for high-DPI displays, and optimizes particle budget based on device hardware.
 */
export default function ThanosAshBurn({ 
  isBurning, 
  onComplete, 
  duration = 2800,
  isFullCard = true 
}) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const animFrameId = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isBurning) {
      if (overlayRef.current) overlayRef.current.dataset.phase = 'idle';
      return;
    }

    // Hardware & accessibility inspection:
    // Respects accessibility and high-refresh displays (e.g. Samsung 90Hz AMOLED)
    // without ever prematurely killing or skipping the emotional release experience!
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trigger synthetic audio combustion whoosh & crackling ash wind
    playAshSnapSound();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 560, height: 440 };

    // Responsive padding calculation:
    // On mobile devices, prevent horizontal overflow (padX = 0) so the canvas matches screen width,
    // while padTop allows ash and smoke to drift gracefully upward into the backdrop.
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const padX = isMobile ? 0 : 30;
    const padTop = isMobile ? 50 : 70;
    const padBottom = isMobile ? 0 : 30;

    const cardW = Math.max(280, rect.width);
    const cardH = Math.max(200, rect.height);

    const fullW = cardW + padX * 2;
    const fullH = cardH + padTop + padBottom;

    // Retina / High-DPI display sharpness (capped at 2 for optimal GPU performance)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(fullW * dpr);
    canvas.height = Math.round(fullH * dpr);
    canvas.style.width = `${fullW}px`;
    canvas.style.height = `${fullH}px`;
    canvas.style.left = isMobile ? '0px' : `-${padX}px`;
    canvas.style.top = `-${padTop}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Responsive particle streaming configuration optimized for 60Hz, 90Hz (Samsung A33), and 120Hz:
    const targetActiveParticles = prefersReducedMotion ? 90 : (isMobile ? 160 : 320);
    const baseSpawnRate = prefersReducedMotion ? 3 : (isMobile ? 5 : 9);

    // Burning color palette strictly adhering to design requirements
    // 1. Incandescent embers: #FC2904, #FF704F, warm amber, white-hot spark
    const emberColors = [
      { main: '#FC2904', halo: 'rgba(252, 41, 4, 0.35)' },
      { main: '#FF704F', halo: 'rgba(255, 112, 79, 0.4)' },
      { main: '#ff4500', halo: 'rgba(255, 69, 0, 0.35)' },
      { main: '#ffaa00', halo: 'rgba(255, 170, 0, 0.45)' },
      { main: '#ffffff', halo: 'rgba(255, 230, 180, 0.5)' }
    ];
    // 2. Charred paper flakes: deep black charcoal, charred carbon, burnt ash
    const charcoalColors = ['#0c0a09', '#181514', '#1c1917', '#272320', '#3a3532', '#44403c'];
    // 3. Fine ash dust: grey ash, muted stone, drifting soot
    const dustColors = ['#71717a', '#a1a1aa', '#cbd5e1', '#52525b', '#78716c'];
    // 4. Subtle smoke: soft grey/black translucent wisps
    const smokeColors = ['rgba(40, 35, 35, ', 'rgba(60, 55, 55, ', 'rgba(80, 75, 75, '];

    const particles = [];
    const startTime = performance.now();
    let lastTime = startTime;
    let currentPhase = 'idle';

    // Helper: generate irregular polygon vertices for realistic jagged ash flakes
    const createAshPolygon = (radius) => {
      const vertexCount = Math.floor(Math.random() * 3) + 4; // 4 to 6 vertices
      const vertices = [];
      for (let i = 0; i < vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const dist = radius * (0.65 + Math.random() * 0.7);
        vertices.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist
        });
      }
      return vertices;
    };

    // Continuous streaming particle generator normalized by delta time
    const spawnAshParticles = (burnLineX, progress, dtNorm) => {
      while (particles.length > targetActiveParticles) {
        particles.shift();
      }

      const spawnCount = Math.max(1, Math.round(baseSpawnRate * dtNorm));
      for (let i = 0; i < spawnCount; i++) {
        const rand = Math.random();
        let type, color, haloColor = null, size, isEmber = false, vertices = null;

        const yNorm = Math.random();
        const waveOffset = isMobile ? Math.sin(yNorm * Math.PI) * 16 : 0;
        const localX = padX + burnLineX + waveOffset + (Math.random() - 0.5) * 28;
        const localY = padTop + yNorm * cardH;

        if (rand < 0.28) {
          type = 'ember';
          isEmber = true;
          const chosen = emberColors[Math.floor(Math.random() * emberColors.length)];
          color = chosen.main;
          haloColor = chosen.halo;
          size = Math.random() * 2.4 + 1.2;
        } else if (rand < 0.72) {
          type = 'flake';
          color = charcoalColors[Math.floor(Math.random() * charcoalColors.length)];
          size = Math.random() * 4.4 + 2.0;
          vertices = createAshPolygon(size);
        } else if (rand < 0.90) {
          type = 'dust';
          color = dustColors[Math.floor(Math.random() * dustColors.length)];
          size = Math.random() * 1.8 + 0.8;
        } else {
          type = 'smoke';
          color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
          size = Math.random() * 10 + 7;
        }

        const upwardSpeed = type === 'smoke' 
          ? Math.random() * 1.2 + 0.6 
          : type === 'ember' 
            ? Math.random() * 3.4 + 1.4 
            : Math.random() * 2.6 + 1.1;

        const lateralSpeed = (Math.random() * 2.2 - 0.6) + (progress * 1.0);

        particles.push({
          x: Math.max(0, Math.min(fullW, localX)),
          y: localY,
          vx: lateralSpeed,
          vy: -upwardSpeed,
          size: size,
          baseSize: size,
          color: color,
          haloColor: haloColor,
          type: type,
          isEmber: isEmber,
          vertices: vertices,
          alpha: type === 'smoke' ? 0.18 : 1.0,
          decay: type === 'smoke' 
            ? Math.random() * 0.010 + 0.012 
            : type === 'ember' 
              ? Math.random() * 0.018 + 0.016 
              : Math.random() * 0.016 + 0.014,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.22,
          wobbleSpeed: Math.random() * 0.14 + 0.05,
          wobbleOffset: Math.random() * Math.PI * 2,
          aspect: Math.random() * 0.5 + 0.75,
          life: 0
        });
      }
    };

    let animationCompleteCalled = false;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const rawDt = Math.min(50, now - lastTime);
      const dt = rawDt / 16.67;
      lastTime = now;

      // Update phase via DOM dataset without triggering React component re-renders
      let nextPhase = 'idle';
      if (progress < 0.18) nextPhase = 'igniting';
      else if (progress < 0.42) nextPhase = 'charring';
      else if (progress < 0.82) nextPhase = 'disintegrating';
      else nextPhase = 'dissolving';

      if (currentPhase !== nextPhase) {
        currentPhase = nextPhase;
        if (overlayRef.current) overlayRef.current.dataset.phase = nextPhase;
      }

      ctx.clearRect(0, 0, fullW, fullH);

      // Sweeping burn front across the letter card
      const sweepX = progress * (cardW + 60) - 15;

      // Spawn ash, embers, dust, and smoke along the active burn front
      if (progress >= 0.06 && progress < 0.82) {
        spawnAshParticles(sweepX, progress, dt);
      }

      // Draw glowing incandescent fire edge along the burn seam (#FC2904, #FF704F, white-hot center)
      if (progress >= 0.08 && progress < 0.85) {
        const seamDrawX = padX + sweepX;
        const seamWidth = isMobile ? 44 : 54;
        const seamFade = progress > 0.70 ? (0.85 - progress) / 0.15 : 1.0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, seamFade));
        const seamGrad = ctx.createLinearGradient(seamDrawX - 30, 0, seamDrawX + 16, 0);
        seamGrad.addColorStop(0, 'rgba(252, 41, 4, 0)');
        seamGrad.addColorStop(0.35, 'rgba(252, 41, 4, 0.45)');
        seamGrad.addColorStop(0.68, 'rgba(255, 112, 79, 0.85)'); // #FF704F
        seamGrad.addColorStop(0.88, 'rgba(255, 235, 180, 0.95)'); // Incandescent core
        seamGrad.addColorStop(1, 'rgba(252, 41, 4, 0)');

        ctx.fillStyle = seamGrad;
        ctx.fillRect(Math.max(0, seamDrawX - 30), padTop, seamWidth, cardH);

        // Popping crackle sparks directly on the burning line
        const sparkCount = isMobile ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 3) + 2;
        for (let s = 0; s < sparkCount; s++) {
          const sparkY = padTop + Math.random() * cardH;
          const sparkX = seamDrawX + (Math.random() - 0.5) * 10;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, Math.random() * 1.8 + 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
        ctx.restore();
      }

      // Dynamic decay multiplier accelerating toward the end of the burn
      const decayBoost = progress > 0.75 ? 3.0 : progress > 0.55 ? 1.6 : 1.0;

      // Update & render all active particles (embers, flakes, dust, smoke)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;

        p.wobbleOffset += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobbleOffset) * 1.0) * dt;
        p.y += p.vy * dt;
        p.vy -= 0.022 * dt; // Continuous thermal buoyancy (hot air lift)
        p.vx *= 0.985; // Air drag
        p.angle += p.angularSpeed * dt;
        p.alpha -= p.decay * dt * decayBoost;

        if (p.type === 'smoke') {
          p.size = p.baseSize + p.life * 0.16;
        }

        // Remove expired particles
        if (p.alpha <= 0 || p.y < -20 || p.x > fullW + 30 || p.x < -30) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.isEmber) {
          // High-speed dual-circle halo glow (100% hardware accelerated on Mali-G68 GPU)
          if (p.haloColor) {
            ctx.fillStyle = p.haloColor;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'flake') {
          // Irregular Jagged Charcoal Ash Flake (tumbling in 3D air)
          ctx.fillStyle = p.color;
          const flipScale = 0.5 + Math.sin(p.wobbleOffset) * 0.5;
          ctx.scale(1, flipScale);

          if (p.vertices && p.vertices.length > 2) {
            ctx.beginPath();
            ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
            for (let v = 1; v < p.vertices.length; v++) {
              ctx.lineTo(p.vertices[v].x, p.vertices[v].y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * p.aspect);
          }
        } else if (p.type === 'smoke') {
          // Subtle Smoke Wisp
          ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fine Ash Dust Speck
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Check completion: once progress reaches 1, cleanly dissolve and finish
      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, fullW, fullH);
        if (!animationCompleteCalled) {
          animationCompleteCalled = true;
          if (typeof onCompleteRef.current === 'function') {
            onCompleteRef.current();
          }
        }
      }
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isBurning, duration, isFullCard]);

  if (!isBurning) return null;

  return (
    <div 
      ref={overlayRef}
      className="thanos-card-ash-overlay" 
      data-phase="idle"
      aria-hidden="true"
    >
      {/* SVG Definitions for organic turbulent burn distortion and charring */}
      <svg width="0" height="0" className="thanos-hidden-svg" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="thanosCharDistort">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <canvas ref={canvasRef} className="thanos-card-ash-canvas" />
    </div>
  );
}
