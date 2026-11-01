export const LOOP = 12;
const RESET = 11.6;
const glide = "cubic-bezier(0.65, 0, 0.35, 1)";
const settle = "cubic-bezier(0.22, 1, 0.36, 1)";

type Frames = [number, string][];
interface Track {
  sel: string;
  frames: Frames;
  ease?: string;
}

const at = (seconds: number) => `${Number(((seconds / LOOP) * 100).toFixed(3))}%`;

function show(start: number, on: string, off: string, end = RESET, fade = 0.3): Frames {
  return [
    [0, off],
    [start, off],
    [start + fade, on],
    [end, on],
    [end + fade, off],
    [LOOP, off],
  ];
}

function flash(start: number): Frames {
  return [
    [0, "opacity:0;transform:scale(1)"],
    [start - 0.01, "opacity:0;transform:scale(1)"],
    [start, "opacity:0.95;transform:scale(1)"],
    [start + 0.6, "opacity:0;transform:scale(1.9)"],
    [LOOP, "opacity:0;transform:scale(1.9)"],
  ];
}

function stamp(start: number, end: number): Frames {
  return [
    [0, "opacity:0;transform:rotate(-7deg) scale(1.9)"],
    [start, "opacity:0;transform:rotate(-7deg) scale(1.9)"],
    [start + 0.22, "opacity:1;transform:rotate(-7deg) scale(1)"],
    [end, "opacity:1;transform:rotate(-7deg) scale(1)"],
    [end + 0.35, "opacity:0;transform:rotate(-7deg) scale(0.96)"],
    [LOOP, "opacity:0;transform:rotate(-7deg) scale(0.96)"],
  ];
}

function flight(start: number, arrive: number, then: Frames): Frames {
  return [[0, "opacity:0;transform:translate(0,0)"], [start, "opacity:0;transform:translate(0,0)"], [start + 0.12, "opacity:1;transform:translate(0,0)"], [arrive, "opacity:1;transform:translate(50%,0)"], ...then];
}

function drop(at: number): Frames {
  return [
    [at, "opacity:1;transform:translate(50%,0)"],
    [at + 0.45, "opacity:0;transform:translate(50%,16px)"],
    [LOOP, "opacity:0;transform:translate(50%,16px)"],
  ];
}

const step = 100 / 7;
const feedAt = (rows: number) => `transform:translateY(${(-step * rows).toFixed(3)}%)`;

const chainTimes: Record<number, number> = { 6: 1.6, 7: 4.3, 8: 6.1, 9: 8.9, 10: 9.15, 11: 10.0 };

function chainTracks(): Track[] {
  return Object.entries(chainTimes).flatMap(([seq, time]) => [
    { sel: `.cb-link-${seq}`, frames: show(time, "opacity:1", "opacity:0.34") },
    { sel: `.cb-link-${seq}::before`, frames: [[0, "opacity:0"], [time, "opacity:0"], [time + 0.2, "opacity:1"], [time + 1.4, "opacity:0"], [LOOP, "opacity:0"]] as Frames },
    { sel: `.cb-wire-${seq}`, frames: show(time + 0.15, "stroke-dashoffset:0", "stroke-dashoffset:1", RESET, 0.6) },
  ]);
}

const cursorAt = (x: number, y: number) => `opacity:1;transform:translate(${x}%,${y}px)`;

const tracks: Track[] = [
  {
    sel: ".cb-feed-list",
    frames: [
      [0, `opacity:1;${feedAt(3)}`],
      [1.0, `opacity:1;${feedAt(3)}`],
      [1.45, `opacity:1;${feedAt(2)}`],
      [3.8, `opacity:1;${feedAt(2)}`],
      [4.25, `opacity:1;${feedAt(1)}`],
      [5.6, `opacity:1;${feedAt(1)}`],
      [6.05, `opacity:1;${feedAt(0)}`],
      [RESET, `opacity:1;${feedAt(0)}`],
      [RESET + 0.25, `opacity:0;${feedAt(0)}`],
      [RESET + 0.26, `opacity:0;${feedAt(3)}`],
      [LOOP, `opacity:1;${feedAt(3)}`],
    ],
  },
  { sel: ".cb-row-watch", frames: show(1.05, "opacity:1", "opacity:0", RESET + 0.26, 0.01) },
  { sel: ".cb-row-lamp", frames: show(3.85, "opacity:1", "opacity:0", RESET + 0.26, 0.01) },
  { sel: ".cb-row-resent", frames: show(5.65, "opacity:1", "opacity:0", RESET + 0.26, 0.01) },
  { sel: ".cb-stamp-watch", frames: stamp(1.5, 2.9) },
  { sel: ".cb-stamp-resent", frames: stamp(6.1, 7.4) },
  { sel: ".cb-lamp-held", frames: show(9.8, "opacity:0;transform:translateY(-6px)", "opacity:1;transform:translateY(0)", RESET + 0.26, 0.01) },
  { sel: ".cb-lamp-paid", frames: show(9.8, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(6px)", RESET + 0.26, 0.01) },
  { sel: ".cb-lamp-ref", frames: show(10.05, "opacity:1;transform:translateX(0)", "opacity:0;transform:translateX(-8px)", RESET + 0.26, 0.01) },
  { sel: ".cb-puck-watch", frames: flight(0, 0.9, drop(1.05)) },
  { sel: ".cb-puck-watch .cb-tone-block", frames: show(0.85, "opacity:1", "opacity:0", LOOP - 0.3, 0.1) },
  {
    sel: ".cb-puck-lamp",
    frames: flight(2.8, 3.7, [
      [9.0, "opacity:1;transform:translate(50%,0)"],
      [9.7, "opacity:1;transform:translate(100%,0)"],
      [10.0, "opacity:1;transform:translate(100%,0)"],
      [10.5, "opacity:0;transform:translate(100%,0)"],
      [LOOP, "opacity:0;transform:translate(100%,0)"],
    ]),
  },
  { sel: ".cb-puck-lamp .cb-tone-held", frames: show(3.65, "opacity:1", "opacity:0", 8.95, 0.1) },
  { sel: ".cb-puck-lamp .cb-tone-allow", frames: show(8.95, "opacity:1", "opacity:0", LOOP - 0.3, 0.1) },
  { sel: ".cb-puck-resent", frames: flight(4.6, 5.5, drop(5.65)) },
  { sel: ".cb-puck-resent .cb-tone-block", frames: show(5.45, "opacity:1", "opacity:0", LOOP - 0.3, 0.1) },
  { sel: ".cb-ring-watch", frames: flash(0.9) },
  { sel: ".cb-ring-lamp", frames: flash(3.7) },
  { sel: ".cb-ring-resent", frames: flash(5.5) },
  { sel: ".cb-ring-paypal", frames: flash(9.7) },
  { sel: ".cb-cap-idle", frames: [[0, "opacity:1"], [0.8, "opacity:1"], [0.95, "opacity:0"], [RESET + 0.1, "opacity:0"], [RESET + 0.3, "opacity:1"], [LOOP, "opacity:1"]] },
  { sel: ".cb-cap-watch", frames: show(0.9, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(4px)", 2.7, 0.2) },
  { sel: ".cb-cap-lamp", frames: show(3.7, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(4px)", 4.5, 0.2) },
  { sel: ".cb-cap-resent", frames: show(5.5, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(4px)", 6.6, 0.2) },
  { sel: ".cb-cap-wait", frames: show(6.8, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(4px)", 9.5, 0.2) },
  { sel: ".cb-cap-paid", frames: show(9.7, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(4px)", RESET, 0.2) },
  { sel: ".cb-count-a", frames: [[0, "opacity:1;transform:translateY(0)"], [4.15, "opacity:1;transform:translateY(0)"], [4.35, "opacity:0;transform:translateY(-100%)"], [8.9, "opacity:0;transform:translateY(100%)"], [9.1, "opacity:1;transform:translateY(0)"], [LOOP, "opacity:1;transform:translateY(0)"]] },
  { sel: ".cb-count-b", frames: [[0, "opacity:0;transform:translateY(100%)"], [4.15, "opacity:0;transform:translateY(100%)"], [4.35, "opacity:1;transform:translateY(0)"], [8.9, "opacity:1;transform:translateY(0)"], [9.1, "opacity:0;transform:translateY(-100%)"], [LOOP, "opacity:0;transform:translateY(-100%)"]] },
  { sel: ".cb-count", frames: [[0, "transform:scale(1)"], [4.15, "transform:scale(1)"], [4.3, "transform:scale(1.3)"], [4.6, "transform:scale(1)"], [8.9, "transform:scale(1)"], [9.05, "transform:scale(1.2)"], [9.35, "transform:scale(1)"], [LOOP, "transform:scale(1)"]] },
  {
    sel: ".cb-cursor",
    ease: glide,
    frames: [
      [0, cursorAt(68, 270)],
      [1.1, cursorAt(68, 270)],
      [1.9, cursorAt(34, 288)],
      [2.7, cursorAt(34, 288)],
      [3.5, cursorAt(52, 166)],
      [5.8, cursorAt(54, 170)],
      [6.4, cursorAt(25.5, 61)],
      [7.0, cursorAt(25.5, 61)],
      [7.6, cursorAt(62, 120)],
      [9.6, cursorAt(62, 120)],
      [10.2, cursorAt(50, 366)],
      [10.7, cursorAt(50, 366)],
      [11.2, cursorAt(84, 495)],
      [RESET, cursorAt(84, 495)],
      [RESET + 0.15, "opacity:0;transform:translate(84%,495px)"],
      [RESET + 0.16, "opacity:0;transform:translate(68%,270px)"],
      [LOOP, cursorAt(68, 270)],
    ],
  },
  { sel: ".cb-cursor-tip", frames: [[0, "transform:scale(1)"], [1.95, "transform:scale(1)"], [2.05, "transform:scale(0.82)"], [2.2, "transform:scale(1)"], [6.45, "transform:scale(1)"], [6.55, "transform:scale(0.82)"], [6.7, "transform:scale(1)"], [LOOP, "transform:scale(1)"]] },
  { sel: ".cb-phone-wrap", frames: show(6.6, "opacity:1;transform:translateY(0) rotate(-3deg)", "opacity:0;transform:translateY(48px) rotate(0deg)", 8.5, 0.4) },
  { sel: ".cb-tap", frames: [[0, "opacity:0;transform:scale(0.3)"], [7.85, "opacity:0;transform:scale(0.3)"], [7.9, "opacity:0.55;transform:scale(0.4)"], [8.35, "opacity:0;transform:scale(2.4)"], [LOOP, "opacity:0;transform:scale(2.4)"]] },
  { sel: ".cb-approve", frames: [[0, "transform:scale(1)"], [7.88, "transform:scale(1)"], [7.98, "transform:scale(0.94)"], [8.12, "transform:scale(1)"], [LOOP, "transform:scale(1)"]] },
  { sel: ".cb-approved", frames: show(8.05, "opacity:1;transform:translateY(0)", "opacity:0;transform:translateY(10px)", RESET, 0.25) },
  ...chainTracks(),
  ...[
    [0, 2.7],
    [2.8, 4.5],
    [4.6, 6.6],
    [6.6, 8.9],
    [9.0, RESET],
  ].flatMap(([start, end], index) => [
    { sel: `.cb-beat-${index} .cb-beat-fill`, ease: "linear", frames: [[0, "transform:scaleX(0)"], [start, "transform:scaleX(0)"], [end, "transform:scaleX(1)"], [RESET, "transform:scaleX(1)"], [RESET + 0.3, "transform:scaleX(0)"], [LOOP, "transform:scaleX(0)"]] as Frames },
    { sel: `.cb-beat-${index}`, frames: show(start, "opacity:1", "opacity:0.5", end, 0.2) },
  ]),
];

function rule(track: Track, index: number) {
  const name = `cb-k${index}`;
  const ease = track.ease ?? settle;
  const body = track.frames.map(([seconds, css]) => `${at(seconds)}{${css};animation-timing-function:${ease}}`).join("");
  return `@keyframes ${name}{${body}}.cb-story ${track.sel}{animation:${name} ${LOOP}s infinite both}`;
}

export const storyCss = tracks.map(rule).join("");
