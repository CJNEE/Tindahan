import React from 'react';

export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  
  let badgeClass = 'status-muted';
  
  if (['paid', 'in-stock', 'good', 'completed', 'active'].includes(s)) {
    badgeClass = 'status-success';
  } else if (['partial', 'low', 'warning', 'utang', 'unpaid', 'credit'].includes(s)) {
    badgeClass = 'status-warning';
  } else if (['overdue', 'out', 'danger'].includes(s)) {
    badgeClass = 'status-danger';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      {status || 'Unknown'}
    </span>
  );
}
