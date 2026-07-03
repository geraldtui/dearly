/**
 * Next.js re-mounts `template.tsx` on every navigation (unlike `layout.tsx`,
 * which persists), so this plain wrapper is enough to replay `.page-fade`'s
 * CSS entrance animation on every page change — no client JS or animation
 * library needed. Respects `prefers-reduced-motion` via the global rule in
 * globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
