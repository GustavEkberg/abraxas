"use client";

import { useEffect, useRef } from "react";

interface AsciiFireProps {
  intensity?: number; // 0+, will be dynamic based on active rituals
}

/**
 * ASCII fire background effect.
 * Renders a fire animation at the bottom of the screen.
 * Fire size caps at intensity 35, above which color shifts from white to red/yellow.
 * Intensity increases with active ritual tasks.
 * Smoothly interpolates intensity changes for a gradual visual effect.
 */
export function AsciiFire({ intensity = 0 }: AsciiFireProps) {
  const fireRef = useRef<HTMLPreElement>(null);
  const firePixelsRef = useRef<number[]>([]);
  const widthRef = useRef(0);
  const heightRef = useRef(200);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const currentIntensityRef = useRef(0);
  const targetIntensityRef = useRef(0);

  // Update target intensity when prop changes (without restarting animation)
  useEffect(() => {
    targetIntensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    if (!fireRef.current) return;

    // ASCII characters sorted by visual weight (density)
    const charSet = " .:-=+*#%@".split("");
    const height = heightRef.current;
    const decayRate = 2; // Controls fire height
    const interpolationSpeed = 0.15; // Speed of intensity change (0-1, lower = slower)

    function init() {
      // Calculate width based on character size (~6px per char)
      widthRef.current = Math.floor(window.innerWidth / 6);
      firePixelsRef.current = new Array(widthRef.current * height).fill(0);
    }

    function step() {
      const width = widthRef.current;
      const firePixels = firePixelsRef.current;

      // Smoothly interpolate current intensity towards target
      const diff = targetIntensityRef.current - currentIntensityRef.current;
      if (Math.abs(diff) > 0.1) {
        currentIntensityRef.current += diff * interpolationSpeed;
      } else {
        currentIntensityRef.current = targetIntensityRef.current;
      }

      // 1. Update the "Source" (bottom row) with interpolated intensity
      // Cap fire size at 35, use excess intensity for color changes
      const rawIntensity = Math.round(currentIntensityRef.current);
      const displayIntensity = Math.min(rawIntensity, 35);
      for (let i = 0; i < width; i++) {
        firePixels[(height - 1) * width + i] = displayIntensity;
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

    function getCharColor(y: number, intensity: number): string {
      if (intensity <= 35) {
        return "rgba(255, 255, 255, 0.4)"; // white for low intensity
      }

      // Calculate vertical position factor (0 at top, 1 at bottom)
      const verticalFactor = y / (height - 1);

      // Only apply color to lower portion of fire (bottom 70%)
      if (verticalFactor < 0.3) {
        return "rgba(255, 255, 255, 0.4)"; // white for upper fire
      }

      // Color intensity factor (0-1) based on how far above threshold we are
      const colorIntensity = Math.min((intensity - 35) / (120 - 35), 1);

      // Vertical color gradient: more intense at bottom
      const bottomFactor = Math.pow(1 - verticalFactor, 1.5); // Exponential falloff from bottom

      // Add some horizontal randomness for more natural look
      const horizontalRandom = 0.7 + Math.random() * 0.6; // 0.7-1.3

      // Combine factors with randomness
      const totalFactor = colorIntensity * bottomFactor * horizontalRandom;

      if (totalFactor < 0.15) {
        return "rgba(255, 255, 255, 0.4)"; // mostly white
      }

      // Interpolate from white to orange-red
      const r = 255;
      const g = Math.round(255 - (totalFactor * 155)); // 255 -> 100
      const b = Math.round(255 - (totalFactor * 255)); // 255 -> 0

      return `rgba(${r}, ${g}, ${b}, 0.4)`;
    }

    function render() {
      if (!fireRef.current) return;

      let output = "";
      const width = widthRef.current;
      const firePixels = firePixelsRef.current;
      const currentIntensity = currentIntensityRef.current;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIntensity = firePixels[y * width + x];
          if (pixelIntensity === 0) {
            output += " ";
          } else {
            const charIdx = Math.floor(
              (pixelIntensity / 35) * (charSet.length - 1)
            );
            const char = charSet[charIdx];
            const color = getCharColor(y, currentIntensity);

            // Wrap character in span with color
            output += `<span style="color: ${color}">${char}</span>`;
          }
        }
        output += "\n";
      }

      fireRef.current.innerHTML = output;
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
  }, []);

  return (
    <pre
      ref={fireRef}
      className="z-50 pointer-events-none fixed bottom-0 left-0 w-full whitespace-pre text-center font-mono text-[10px] leading-[8px]"
      aria-hidden="true"
    />
  );
}
