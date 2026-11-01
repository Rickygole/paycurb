import type { CSSProperties } from "react";

export function Roll({ text, scroll = false }: { text: string; scroll?: boolean }) {
  const chars = [...text];
  return (
    <span className={`ca-roll num${scroll ? " is-scroll" : ""}`}>
      <span className="ca-hidden">{text}</span>
      <span className="ca-roll-in" aria-hidden="true">
        {chars.map((char, index) => {
          const place = chars.length - index;
          return /\d/.test(char) ? (
            <span key={place} className="ca-roll-col" style={{ "--d": Number(char), "--i": place } as CSSProperties}>
              <span className="ca-roll-strip" />
            </span>
          ) : (
            <span key={`s${place}`} className="ca-roll-sym">
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
