export function LogoGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="logo-glyph">
      <path d="M2 4a2 2 0 0 1 2-2h1.5a2 2 0 0 1 2 2v7.5H16a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoGlyph size={size} />
      Paycurb
    </span>
  );
}
