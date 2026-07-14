export type MindCameraPosition = {
  tx: number;
  ty: number;
  scale: number;
};

type MindCameraAnimationOptions = {
  from: MindCameraPosition;
  to: MindCameraPosition;
  durationMs?: number;
  onFrame: (camera: MindCameraPosition) => void;
};

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function animateMindCamera(options: MindCameraAnimationOptions) {
  const durationMs = Math.max(80, options.durationMs ?? 180);
  const startedAt = performance.now();
  let frameId: number | null = null;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = easeOutCubic(progress);
    options.onFrame({
      tx: options.from.tx + (options.to.tx - options.from.tx) * eased,
      ty: options.from.ty + (options.to.ty - options.from.ty) * eased,
      scale: options.from.scale + (options.to.scale - options.from.scale) * eased,
    });
    if (progress < 1) frameId = requestAnimationFrame(step);
  };

  frameId = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    if (frameId != null) cancelAnimationFrame(frameId);
  };
}
