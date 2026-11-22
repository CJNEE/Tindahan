import React from 'react'

export default function DashboardCard({ title, value, hint, icon, color }){
  return (
    <div className="dashboard-stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="stat-title">{title}</span>
          <div className="stat-value">{value}</div>
        </div>
        <div className="stat-icon-wrap">
          {icon}
        </div>
      </div>
      {hint && (
        <div className="stat-hint">
          {hint}
        </div>
      )}
    </div>
  )
}
