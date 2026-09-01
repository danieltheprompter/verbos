import { useState } from "react";

export function ClearProgress({ onClear }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button className="btn btn-ghost" type="button" onClick={() => setConfirming(true)}>
        Clear progress
      </button>
    );
  }

  return (
    <div className="clear-confirm">
      <p>Clear the atlas? This cannot be undone.</p>
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => {
          onClear();
          setConfirming(false);
        }}
      >
        Clear it
      </button>
      <button className="text-back" type="button" onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </div>
  );
}
