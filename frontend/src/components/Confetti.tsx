import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function Confetti() {
  useEffect(() => {
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return null;
}
