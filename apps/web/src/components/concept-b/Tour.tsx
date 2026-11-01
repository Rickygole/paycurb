"use client";

import { useEffect, useRef, useState } from "react";

export interface TourStep {
  id: string;
  title: string;
  body: React.ReactNode;
  figure: React.ReactNode;
}

export function Tour({ steps }: { steps: TourStep[] }) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-step]") ?? []);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="cb-tour">
      <ol className="cb-tour-steps" ref={list}>
        {steps.map((step, index) => (
          <li key={step.id} data-step={index} className="cb-tour-step" data-on={index === active}>
            <span className="cb-tour-tick" aria-hidden="true" />
            <h3>{step.title}</h3>
            {step.body}
            <div className="cb-tour-inline" data-ui>{step.figure}</div>
          </li>
        ))}
      </ol>
      <div className="cb-tour-stage" aria-hidden="true">
        <div className="cb-tour-win" data-ui>
          <div className="cb-chrome">
            <span className="cb-url">paycurb, one payment</span>
          </div>
          <div className="cb-tour-progress">
            {steps.map((step, index) => (
              <span key={step.id} data-on={index <= active}>
                {step.title}
              </span>
            ))}
          </div>
          <div className="cb-tour-layers">
            {steps.map((step, index) => (
              <div key={step.id} className="cb-tour-layer" data-on={index === active} data-past={index < active}>
                {step.figure}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
