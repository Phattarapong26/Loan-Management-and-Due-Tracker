import { useEffect, useRef } from 'react';

interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  primaryColor?: string;
  trackColor?: string;
  label?: string;
}

export function DonutChart({
  percentage,
  size = 120,
  strokeWidth = 12,
  primaryColor = "#0065FB",
  trackColor = "#F0F0F0",
  label = "USED"
}: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (percentage / 100));

    ctx.clearRect(0, 0, size, size);

    // Draw Background Track
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw Progress
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw Center Text
    ctx.fillStyle = "#1A1A1A";
    ctx.font = `bold ${size * 0.18}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage.toFixed(1)}%`, center, center - 10);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = `500 ${size * 0.08}px Inter, sans-serif`;
    ctx.fillText(label, center, center + 20);
  }, [percentage, size, strokeWidth, primaryColor, trackColor, label]);

  return <canvas ref={canvasRef} className="transition-all duration-1000" />;
}
