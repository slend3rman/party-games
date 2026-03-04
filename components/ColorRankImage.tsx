'use client';

import { useEffect, useRef } from 'react';
import type { ColorRankRoundData } from '@/lib/game-types';

interface Props {
  roundData: ColorRankRoundData;
}

// Seeded random for consistent generation per round
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export default function ColorRankImage({ roundData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600;
    const H = 400;
    canvas.width = W;
    canvas.height = H;

    // Use the first color's hex as a seed
    const seedVal = roundData.colors.reduce((acc, c) => acc + parseInt(c.hex.slice(1), 16), 0);
    const rand = seededRandom(seedVal);

    // Generate abstract art-like image using Voronoi-ish regions
    // Each color gets a percentage of the canvas area
    const totalPixels = W * H;
    const imageData = ctx.createImageData(W, H);

    // Create random center points for each color, weighted by percentage
    type Region = {
      cx: number;
      cy: number;
      hex: string;
      r: number;
      g: number;
      b: number;
    };

    const regions: Region[] = [];

    // Create multiple seed points per color for organic shapes
    for (const color of roundData.colors) {
      const numPoints = Math.max(2, Math.round(color.percentage / 8));
      const hex = color.hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      for (let i = 0; i < numPoints; i++) {
        regions.push({
          cx: rand() * W,
          cy: rand() * H,
          hex,
          r, g, b,
        });
      }
    }

    // Assign each pixel to nearest region (Voronoi)
    const pixelAssignment = new Array(totalPixels);
    const colorCounts: Record<string, number> = {};

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let minDist = Infinity;
        let nearest = regions[0];

        for (const region of regions) {
          const dx = x - region.cx;
          const dy = y - region.cy;
          // Add some noise for organic boundaries
          const noise = (rand() - 0.5) * 40;
          const dist = dx * dx + dy * dy + noise * noise;

          if (dist < minDist) {
            minDist = dist;
            nearest = region;
          }
        }

        const idx = (y * W + x) * 4;
        // Add subtle variation for texture
        const variation = (rand() - 0.5) * 15;
        imageData.data[idx] = Math.min(255, Math.max(0, nearest.r + variation));
        imageData.data[idx + 1] = Math.min(255, Math.max(0, nearest.g + variation));
        imageData.data[idx + 2] = Math.min(255, Math.max(0, nearest.b + variation));
        imageData.data[idx + 3] = 255;

        colorCounts[nearest.hex] = (colorCounts[nearest.hex] || 0) + 1;
        pixelAssignment[y * W + x] = nearest.hex;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add subtle rounded shapes overlay for visual interest
    for (const color of roundData.colors) {
      const hex = color.hex;
      ctx.fillStyle = hex + '40'; // Semi-transparent
      const numBlobs = Math.round(rand() * 3) + 1;
      for (let i = 0; i < numBlobs; i++) {
        const bx = rand() * W;
        const by = rand() * H;
        const br = rand() * 60 + 20;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  }, [roundData]);

  return (
    <canvas
      ref={canvasRef}
      className="colorrank-canvas w-full"
      style={{ aspectRatio: '3/2' }}
    />
  );
}
