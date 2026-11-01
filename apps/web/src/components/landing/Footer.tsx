import { Logo } from "../Logo";
import { footer } from "./copy";

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-grid">
        <Logo />
        {footer.columns.map((column, index) => (
          <ul key={index}>
            {column.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="legal">
        {footer.line} {footer.license}
      </p>
    </footer>
  );
}
