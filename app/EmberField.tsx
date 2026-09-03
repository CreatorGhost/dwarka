import type { CSSProperties } from "react";

// ponytail: CSS-driven embers, not a canvas + rAF loop. Twelve absolutely
// positioned dots on transform/opacity keyframes cost nothing and pause with
// the tab; reach for a canvas only if we ever need collision or wind.
const EMBERS: CSSProperties[] = [
  { left: "32.8%", "--ember-delay": "2.4s", "--ember-life": "18.9s", "--ember-drift": "-51px", width: 2, height: 2 } as CSSProperties,
  { left: "36.7%", "--ember-delay": "0.9s", "--ember-life": "17.6s", "--ember-drift": "-55px", width: 4, height: 4 } as CSSProperties,
  { left: "41.7%", "--ember-delay": "3.9s", "--ember-life": "18.0s", "--ember-drift": "-52px", width: 2, height: 2 } as CSSProperties,
  { left: "92.0%", "--ember-delay": "10.1s", "--ember-life": "18.2s", "--ember-drift": "-52px", width: 4, height: 4 } as CSSProperties,
  { left: "6.7%", "--ember-delay": "3.5s", "--ember-life": "18.0s", "--ember-drift": "-43px", width: 4, height: 4 } as CSSProperties,
  { left: "15.7%", "--ember-delay": "1.9s", "--ember-life": "15.8s", "--ember-drift": "46px", width: 3, height: 3 } as CSSProperties,
  { left: "11.8%", "--ember-delay": "9.1s", "--ember-life": "14.7s", "--ember-drift": "-47px", width: 2, height: 2 } as CSSProperties,
  { left: "55.6%", "--ember-delay": "9.9s", "--ember-life": "17.5s", "--ember-drift": "9px", width: 3, height: 3 } as CSSProperties,
  { left: "46.2%", "--ember-delay": "14.8s", "--ember-life": "16.3s", "--ember-drift": "-28px", width: 3, height: 3 } as CSSProperties,
  { left: "68.4%", "--ember-delay": "3.9s", "--ember-life": "18.2s", "--ember-drift": "8px", width: 3, height: 3 } as CSSProperties,
  { left: "71.3%", "--ember-delay": "4.6s", "--ember-life": "21.8s", "--ember-drift": "-45px", width: 4, height: 4 } as CSSProperties,
  { left: "17.7%", "--ember-delay": "5.5s", "--ember-life": "21.4s", "--ember-drift": "-5px", width: 2, height: 2 } as CSSProperties,
];

export default function EmberField({ className = "" }: { className?: string }) {
  return (
    <div className={`ember-field ${className}`} aria-hidden="true">
      {EMBERS.map((style, index) => <i key={index} style={style} />)}
    </div>
  );
}
