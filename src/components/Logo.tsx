type LogoProps = {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
  /** Accessible label; set to "" to mark as decorative. */
  title?: string;
};

/**
 * Dearly mark: a minimal, symmetric audio waveform — rounded bars rising to a
 * center pulse, in a vertical terracotta-to-rose gradient.
 */
export default function Logo({ size = 48, className, title = "Dearly" }: LogoProps) {
  const decorative = title === "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      <defs>
        <linearGradient id="dearlyWave" x1="0" y1="12" x2="0" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d4a396" />
          <stop offset="1" stopColor="#a36a5e" />
        </linearGradient>
      </defs>
      <g fill="url(#dearlyWave)">
        <rect x="13.1" y="25.6" width="2.6" height="12.8" rx="1.3" />
        <rect x="17.5" y="20" width="2.6" height="24" rx="1.3" />
        <rect x="21.9" y="13.6" width="2.6" height="36.8" rx="1.3" />
        <rect x="26.3" y="17.2" width="2.6" height="29.6" rx="1.3" />
        <rect x="30.7" y="12" width="2.6" height="40" rx="1.3" />
        <rect x="35.1" y="17.2" width="2.6" height="29.6" rx="1.3" />
        <rect x="39.5" y="13.6" width="2.6" height="36.8" rx="1.3" />
        <rect x="43.9" y="20" width="2.6" height="24" rx="1.3" />
        <rect x="48.3" y="25.6" width="2.6" height="12.8" rx="1.3" />
      </g>
    </svg>
  );
}
