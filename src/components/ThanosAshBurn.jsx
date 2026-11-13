import React, { useEffect, useRef, useState } from 'react';
import { playAshSnapSound } from '../utils/audio';

/**
 * Thanos Snap Ash Burn Disintegration Engine
 * 
 * Delivers a cinematic letter-burning disintegration animation:
 * 1. Ignition & Catching Fire: Subtle glowing red/orange edges (#FC2904, #FF704F) creeping along the card perimeter.
 * 2. Charring & Darkening: Paper darkening into realistic charcoal carbon with heat distortion.
 * 3. Particle Disintegration: Card breaking into hundreds of irregular particles via HTML5 Canvas.
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
  const animFrameId = useRef(null);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'igniting' | 'charring' | 'disintegrating' | 'dissolving'

  useEffect(() => {
    if (!isBurning) {
      setPhase('idle');
      return;
    }

    // Check for user reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Graceful gentle fade for accessibility
      const timer = setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, 700);
      return () => clearTimeout(timer);
    }

    // Trigger synthetic audio combustion whoosh & crackling ash wind
    playAshSnapSound();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 560, height: 440 };

    // Canvas padding so upward-floating ash and smoke drift gracefully beyond card borders without clipping
    const padX = 35;
    const padTop = 75;
    const padBottom = 35;

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
    canvas.style.left = `-${padX}px`;
    canvas.style.top = `-${padTop}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Device capability detection for optimal frame-rate performance
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || navigator.maxTouchPoints > 1);
    const lowCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    const maxParticles = isMobile || lowCores ? 280 : 650;
    const spawnPerFrame = isMobile || lowCores ? 14 : 26;

    // Burning color palette strictly adhering to design requirements
    // 1. Incandescent embers: #FC2904, #FF704F, warm amber, white-hot spark
    const emberColors = ['#FC2904', '#FF704F', '#ff4500', '#ff8c00', '#ffd000', '#ffffff'];
    // 2. Charred paper flakes: deep black charcoal, charred carbon, burnt ash
    const charcoalColors = ['#0c0a09', '#181514', '#1c1917', '#272320', '#3a3532', '#44403c'];
    // 3. Fine ash dust: grey ash, muted stone, drifting soot
    const dustColors = ['#71717a', '#a1a1aa', '#cbd5e1', '#52525b', '#78716c'];
    // 4. Subtle smoke: soft grey/black translucent wisps
    const smokeColors = ['rgba(40, 35, 35, ', 'rgba(60, 55, 55, ', 'rgba(80, 75, 75, '];

    const particles = [];
    const startTime = performance.now();
    let lastTime = startTime;

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

    // Helper: spawn ash, dust, embers, and smoke along the active burn front
    const spawnAshParticles = (burnLineX, burnLineY, progress) => {
      if (particles.length >= maxParticles) return;

      const count = Math.min(spawnPerFrame, maxParticles - particles.length);
      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let type, color, size, isEmber = false, vertices = null;

        // Position particles precisely across the card's active burn area
        const localX = padX + burnLineX + (Math.random() - 0.5) * 36;
        const localY = padTop + (burnLineY !== null ? burnLineY + (Math.random() - 0.5) * 40 : Math.random() * cardH);

        if (rand < 0.28) {
          // Tier 1: Glowing Embers (#FC2904, #FF704F, white-hot spark)
          type = 'ember';
          isEmber = true;
          color = emberColors[Math.floor(Math.random() * emberColors.length)];
          size = Math.random() * 2.8 + 1.2;
        } else if (rand < 0.72) {
          // Tier 2: Irregular Jagged Ash Flakes (Charcoal / Burnt Carbon)
          type = 'flake';
          color = charcoalColors[Math.floor(Math.random() * charcoalColors.length)];
          size = Math.random() * 5.0 + 2.2;
          vertices = createAshPolygon(size);
        } else if (rand < 0.90) {
          // Tier 3: Fine Ash Dust
          type = 'dust';
          color = dustColors[Math.floor(Math.random() * dustColors.length)];
          size = Math.random() * 1.8 + 0.8;
        } else {
          // Tier 4: Subtle Smoke Wisps
          type = 'smoke';
          color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
          size = Math.random() * 12 + 8;
        }

        // Particle physics: natural thermal buoyancy, wind drift, aerodynamic drag
        const upwardSpeed = type === 'smoke' 
          ? Math.random() * 1.2 + 0.6 
          : type === 'ember' 
            ? Math.random() * 3.6 + 1.4 
            : Math.random() * 2.8 + 1.2;

        const lateralSpeed = (Math.random() * 2.6 - 0.8) + (progress * 1.2);

        particles.push({
          x: localX,
          y: localY,
          vx: lateralSpeed,
          vy: -upwardSpeed,
          size: size,
          baseSize: size,
          color: color,
          type: type,
          isEmber: isEmber,
          vertices: vertices,
          alpha: type === 'smoke' ? 0.18 : 1.0,
          decay: type === 'smoke' 
            ? Math.random() * 0.010 + 0.012 
            : type === 'ember' 
              ? Math.random() * 0.015 + 0.018 
              : Math.random() * 0.014 + 0.016,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.22,
          wobbleSpeed: Math.random() * 0.14 + 0.05,
          wobbleOffset: Math.random() * Math.PI * 2,
          // 3D aspect ratio oscillation simulates flipping in air
          aspect: Math.random() * 0.5 + 0.75,
          life: 0
        });
      }
    };

    let animationCompleteCalled = false;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const dt = Math.min(34, now - lastTime) / 16.67; // Normalized frame delta (~1.0 at 60fps)
      lastTime = now;

      // Update phase for CSS / orchestration
      if (progress < 0.18) {
        setPhase('igniting');
      } else if (progress < 0.42) {
        setPhase('charring');
      } else if (progress < 0.80) {
        setPhase('disintegrating');
      } else {
        setPhase('dissolving');
      }

      ctx.clearRect(0, 0, fullW, fullH);

      // Sweeping burn front across the letter card:
      // Starts at left/bottom edges and sweeps across to the right/top
      const sweepX = progress * (cardW + 80) - 20;

      // Spawn ash, embers, dust, and smoke along the sweeping burn front
      if (progress >= 0.08 && progress < 0.72) {
        spawnAshParticles(sweepX, null, progress);
      }

      // Draw the glowing incandescent fire edge along the burn seam (#FC2904, #FF704F, white-hot center)
      if (progress >= 0.10 && progress < 0.78) {
        const seamDrawX = padX + sweepX;
        const seamWidth = 54;
        const seamFade = progress > 0.65 ? (0.78 - progress) / 0.13 : 1.0;

        ctx.save();
        ctx.globalAlpha = seamFade;
        const seamGrad = ctx.createLinearGradient(seamDrawX - 35, 0, seamDrawX + 18, 0);
        seamGrad.addColorStop(0, 'rgba(252, 41, 4, 0)');
        seamGrad.addColorStop(0.35, 'rgba(252, 41, 4, 0.45)');
        seamGrad.addColorStop(0.68, 'rgba(255, 112, 79, 0.85)'); // #FF704F
        seamGrad.addColorStop(0.88, 'rgba(255, 235, 180, 0.95)'); // Incandescent core
        seamGrad.addColorStop(1, 'rgba(252, 41, 4, 0)');

        ctx.fillStyle = seamGrad;
        ctx.fillRect(seamDrawX - 35, padTop, seamWidth, cardH);

        // Popping crackle sparks directly on the burning line
        const sparkCount = Math.floor(Math.random() * 3) + 2;
        for (let s = 0; s < sparkCount; s++) {
          const sparkY = padTop + Math.random() * cardH;
          ctx.beginPath();
          ctx.arc(seamDrawX + (Math.random() - 0.5) * 12, sparkY, Math.random() * 2.0 + 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#FF704F';
          ctx.shadowBlur = 10;
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

        // Aerodynamic aerodynamic flutter & thermal updraft
        p.wobbleOffset += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobbleOffset) * 1.1) * dt;
        p.y += p.vy * dt;
        p.vy -= 0.022 * dt; // Continuous thermal buoyancy (hot air lift)
        p.vx *= 0.985; // Air drag
        p.angle += p.angularSpeed * dt;
        p.alpha -= p.decay * dt * decayBoost;

        // Expand smoke puffs as they dissipate
        if (p.type === 'smoke') {
          p.size = p.baseSize + p.life * 0.18;
        }

        // Remove expired particles
        if (p.alpha <= 0 || p.y < -30 || p.x > fullW + 40 || p.x < -40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.isEmber) {
          // 1. Glowing Hot Ember (#FC2904 / #FF704F / gold / white)
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'flake') {
          // 2. Irregular Jagged Charcoal Ash Flake (tumbling in 3D air)
          ctx.fillStyle = p.color;
          const flipScale = 0.5 + Math.sin(p.wobbleOffset) * 0.5; // Simulates 3D rotation aspect
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
          // 3. Subtle Smoke Wisp
          ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 4. Fine Ash Dust Speck
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
          if (typeof onComplete === 'function') {
            onComplete();
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
  }, [isBurning, duration, isFullCard, onComplete]);

  if (!isBurning) return null;

  return (
    <div 
      className={`thanos-card-ash-overlay thanos-phase-${phase}`} 
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
