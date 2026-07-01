type LogoProps = {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
  /** Accessible label; set to "" to mark as decorative. */
  title?: string;
};

/**
 * Sona mark: simple "S" lettermark.
 */
export default function Logo({ size = 48, className, title = "Sona" }: LogoProps) {
  const decorative = title === "";
  return (
    <span
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      style={{ 
        fontSize: size, 
        fontWeight: 600, 
        lineHeight: 1,
        color: 'var(--ink)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      S
    </span>
  );
}
