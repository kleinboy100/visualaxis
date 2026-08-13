type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function WatermarkedImage({ src, alt, className }: Props) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className ?? ""}`}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <div className="watermark pointer-events-none absolute inset-0" aria-hidden />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-display text-sm font-semibold tracking-[0.3em] text-primary/70 uppercase drop-shadow-sm">
          Visual Axis
        </span>

      </span>
    </div>
  );
}
