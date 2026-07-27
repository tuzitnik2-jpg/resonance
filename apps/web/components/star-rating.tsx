"use client";

import { useState } from "react";

/**
 * A 5-star rating with half-star precision, mapped to the app's 0–10 scale (each half = 1 point).
 * Interactive by default; pass `readOnly` for a compact display.
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
}: {
  value: number; // 0–10
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div
      className={`star-rating${readOnly ? " star-rating--sm" : ""}`}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const pct = Math.max(0, Math.min(1, shown / 2 - (i - 1))) * 100;
        return (
          <span className="star" key={i}>
            <span className="star-bg">★</span>
            <span className="star-fill" style={{ width: `${pct}%` }}>
              ★
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  className="star-hit star-hit-left"
                  aria-label={`Rate ${i * 2 - 1} of 10`}
                  onMouseEnter={() => setHover(i * 2 - 1)}
                  onClick={() => onChange?.(i * 2 - 1)}
                />
                <button
                  type="button"
                  className="star-hit star-hit-right"
                  aria-label={`Rate ${i * 2} of 10`}
                  onMouseEnter={() => setHover(i * 2)}
                  onClick={() => onChange?.(i * 2)}
                />
              </>
            )}
          </span>
        );
      })}
      {!readOnly && (
        <>
          <span className="star-value">{shown > 0 ? `${shown}/10` : "Not rated"}</span>
          {value > 0 && (
            <button type="button" className="star-clear" onClick={() => onChange?.(0)}>
              clear
            </button>
          )}
        </>
      )}
    </div>
  );
}
