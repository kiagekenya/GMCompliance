// BaselineProgressBanner.jsx
//
// Every requirement goes onto the calendar with no due date (status
// 'awaiting_baseline' - see backend/routes/complianceItems/confirmItems.js)
// until the operator supplies its real last-completed date from Settings >
// Baseline last-completed dates (components/settings/BaselineDates.jsx).
// This is the persistent, on-every-page nudge that reminds them it's not
// done yet: an "N/Total set" counter, orange while incomplete, that turns
// green the moment the last one is confirmed. Lives in its own file so
// Dashboard.jsx only needs one line to render it.

import React from 'react';

const BaselineProgressBanner = ({ items = [], onClick }) => {
  if (items.length === 0) return null;

  const totalCount = items.length;
  const doneCount = items.filter((item) => Boolean(item.lastCompleted)).length;
  const isComplete = doneCount === totalCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className="baseline-progress-banner"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        padding: '10px 12px',
        margin: '10px 0',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#fff',
        background: isComplete ? '#3F6B52' : '#C98A1E',
        transition: 'background 0.3s ease',
      }}
    >
      {isComplete
        ? '✓ All regulation dates confirmed'
        : `⚠ Set your regulation dates: ${doneCount}/${totalCount} done`}
      {!isComplete && (
        <div style={{ fontWeight: 400, marginTop: 2, opacity: 0.9 }}>
          Tap to set each requirement's real last-completed date
        </div>
      )}
    </button>
  );
};

export default BaselineProgressBanner;
