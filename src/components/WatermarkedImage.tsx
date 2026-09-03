type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function WatermarkedImage({ src, alt, className }: Props) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className ?? ""}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.dataset['retried']) {
            img.style.visibility = "hidden";
            return;
          }
          img.dataset['retried'] = "1";
          img.src = `${src}${src.includes("?") ? "&" : "?"}r=1`;
        }}
      />
      <div className="watermark pointer-events-none absolute inset-0" aria-hidden />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-display text-sm font-semibold tracking-[0.3em] text-primary/70 uppercase drop-shadow-sm">
          Visual Axis
        </span>

      </span>
    </div>
  );
}
