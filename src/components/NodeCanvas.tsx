// (c) The-Dispatcher
import { useEffect, useRef } from "react";

/** Interactive dark grid of interconnected nodes that warp toward the pointer. */
export function NodeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999 };
    let nodes: { x: number; y: number; bx: number; by: number; vx: number; vy: number }[] = [];

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = 70;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;
      nodes = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          nodes.push({ x, y, bx: x, by: y, vx: 0, vy: 0 });
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Update nodes
      for (const n of nodes) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        const r = 160;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / r) * 0.9;
          n.vx -= (dx / d) * force;
          n.vy -= (dy / d) * force;
        }
        // Spring back to base
        n.vx += (n.bx - n.x) * 0.02;
        n.vy += (n.by - n.y) * 0.02;
        n.vx *= 0.86;
        n.vy *= 0.86;
        n.x += n.vx;
        n.y += n.vy;
      }

      // Draw connections (short lines to nearest right/down neighbor by base grid)
      const spacing = 70;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;
      ctx.lineWidth = 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const n = nodes[idx];
          if (!n) continue;
          const right = nodes[(i + 1) * rows + j];
          const down = nodes[i * rows + (j + 1)];
          const midx = n.x;
          const midy = n.y;
          const dxm = mouse.x - midx;
          const dym = mouse.y - midy;
          const dist = Math.sqrt(dxm * dxm + dym * dym);
          const glow = Math.max(0, 1 - dist / 260);
          const alpha = 0.06 + glow * 0.65;
          const color = glow > 0.15
            ? `rgba(255, 199, 0, ${alpha})`
            : `rgba(180, 180, 190, ${alpha})`;
          ctx.strokeStyle = color;
          if (right) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
          }
          if (down) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(down.x, down.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const dxm = mouse.x - n.x;
        const dym = mouse.y - n.y;
        const dist = Math.sqrt(dxm * dxm + dym * dym);
        const glow = Math.max(0, 1 - dist / 220);
        const size = 1 + glow * 2.5;
        ctx.fillStyle = glow > 0.2 ? `rgba(255, 199, 0, ${0.4 + glow * 0.6})` : `rgba(160, 170, 190, 0.35)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    setup();
    draw();
    window.addEventListener("resize", setup);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setup);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      aria-hidden="true"
    />
  );
}
