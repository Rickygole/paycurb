export function Header({ threatModel }: { threatModel: string }) {
  return (
    <header className="bar">
      <a className="mark" href="#top" aria-label="Paycurb, back to the top">
        paycurb
      </a>
      <nav aria-label="Page" className="bar-links">
        <a href="#how">How it works</a>
        <a href="#stops">What it stops</a>
        <a href={threatModel}>Threat model</a>
      </nav>
      <a className="btn btn-solid btn-bar" href="#open">
        Open the live demo
      </a>
    </header>
  );
}
