"use client";

import { useEffect, useRef } from "react";

interface AsciiFireProps {
  intensity?: number; // 0-35, will be dynamic based on active rituals
}

/**
 * ASCII fire background effect.
 * Renders a grayscale fire animation at the bottom of the screen.
 * Intensity increases with active ritual tasks.
 */
export function AsciiFire({ intensity = 0 }: AsciiFireProps) {
  const fireRef = useRef<HTMLPreElement>(null);
  const firePixelsRef = useRef<number[]>([]);
  const widthRef = useRef(0);
  const heightRef = useRef(50);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!fireRef.current) return;

    // ASCII characters sorted by visual weight (density)
    const charSet = " .:-=+*#%@".split("");
    const height = heightRef.current;
    const decayRate = 2; // Controls fire height

    function init() {
      // Calculate width based on character size (~6px per char)
      widthRef.current = Math.floor(window.innerWidth / 6);
      firePixelsRef.current = new Array(widthRef.current * height).fill(0);
    }

    function step() {
      const width = widthRef.current;
      const firePixels = firePixelsRef.current;

      // 1. Update the "Source" (bottom row) with intensity
      for (let i = 0; i < width; i++) {
        firePixels[(height - 1) * width + i] = intensity;
      }

      // 2. Propagate heat upwards
      for (let x = 0; x < width; x++) {
        for (let y = 1; y < height; y++) {
          const srcIdx = y * width + x;
          const pixel = firePixels[srcIdx];

          if (pixel === 0) {
            firePixels[srcIdx - width] = 0;
          } else {
            const decay = Math.floor(Math.random() * decayRate);
            const drift = Math.floor(Math.random() * 3) - 1;
            const dstIdx = srcIdx - width + drift;

            if (dstIdx >= 0) {
              firePixels[dstIdx] = Math.max(0, pixel - decay);
            }
          }
        }
      }
      render();
    }

    function render() {
      if (!fireRef.current) return;

      let output = "";
      const width = widthRef.current;
      const firePixels = firePixelsRef.current;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIntensity = firePixels[y * width + x];
          if (pixelIntensity === 0) {
            output += " ";
          } else {
            const charIdx = Math.floor(
              (pixelIntensity / 35) * (charSet.length - 1)
            );
            output += charSet[charIdx];
          }
        }
        output += "\n";
      }
      fireRef.current.textContent = output;
    }

    function animate() {
      step();
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    init();
    animate();

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [intensity]);

  return (
    <pre
      ref={fireRef}
      className="pointer-events-none fixed bottom-0 left-0 z-0 h-[400px] w-full overflow-hidden whitespace-pre text-center font-mono text-[10px] leading-[8px] text-white/40"
      aria-hidden="true"
    />
  );
}
