"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Evil ASCII spark effect that emits random characters.
 * Creates a chaotic, demonic energy effect for executing tasks.
 */
export function AsciiSpark() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const chars = "%#*+=:-.".split("");

  useEffect(() => {
    let animationFrame: number;
    let particleId = 0;
    let lastSpawn = 0;

    const animate = (timestamp: number) => {
      // Spawn new particles every 80-150ms
      if (timestamp - lastSpawn > 80 + Math.random() * 70) {
        // Pick random border side (0=top, 1=right, 2=bottom, 3=left)
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0, vx = 0, vy = 0;
        
        // Spawn from random position along border and shoot outward
        switch(side) {
          case 0: // top
            x = Math.random() * 60 - 10; // -10 to 50 (card width range)
            y = -2;
            vx = (Math.random() - 0.5) * 2;
            vy = -(Math.random() * 2 + 1); // shoot upward
            break;
          case 1: // right
            x = 52;
            y = Math.random() * 20 - 2; // card height range
            vx = Math.random() * 2 + 1; // shoot rightward
            vy = (Math.random() - 0.5) * 2;
            break;
          case 2: // bottom
            x = Math.random() * 60 - 10;
            y = 18;
            vx = (Math.random() - 0.5) * 2;
            vy = Math.random() * 2 + 1; // shoot downward
            break;
          case 3: // left
            x = -2;
            y = Math.random() * 20 - 2;
            vx = -(Math.random() * 2 + 1); // shoot leftward
            vy = (Math.random() - 0.5) * 2;
            break;
        }
        
        const newParticle: Particle = {
          id: particleId++,
          char: chars[Math.floor(Math.random() * chars.length)],
          x,
          y,
          vx,
          vy,
          life: 1,
          maxLife: 0.8 + Math.random() * 0.4,
        };
        lastSpawn = timestamp;

        setParticles((prev) => [...prev, newParticle]);
      }

      // Update existing particles
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0)
      );

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-red-400 pointer-events-none text-xs font-mono"
          style={{
            left: `${p.x * 4}px`,
            top: `${p.y * 4}px`,
            opacity: p.life,
            transform: "translate(-50%, -50%)",
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
