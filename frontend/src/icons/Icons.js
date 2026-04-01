import React from 'react';

export const DashboardIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="7" height="7" rx="1.5"/>
    <rect x="11" y="2" width="7" height="7" rx="1.5"/>
    <rect x="2" y="11" width="7" height="7" rx="1.5"/>
    <rect x="11" y="11" width="7" height="7" rx="1.5"/>
  </svg>
);

export const TransactionIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 3v14M2 14l3 3 3-3"/>
    <path d="M15 17V3M12 6l3-3 3 3"/>
  </svg>
);

export const BudgetIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1" y="5" width="18" height="12" rx="2"/>
    <path d="M1 9h18"/>
    <path d="M5 13h3M14 13h1"/>
  </svg>
);

export const StatsIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 17h16"/>
    <rect x="3" y="10" width="4" height="7" rx="0.5"/>
    <rect x="8" y="6" width="4" height="11" rx="0.5"/>
    <rect x="13" y="3" width="4" height="14" rx="0.5"/>
  </svg>
);

export const SettingsIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
    <line x1="3" y1="5" x2="6" y2="5"/>
    <circle cx="8.5" cy="5" r="2.5" fill="var(--surface, #fff)"/>
    <line x1="11" y1="5" x2="17" y2="5"/>
    <line x1="3" y1="10" x2="11" y2="10"/>
    <circle cx="13.5" cy="10" r="2.5" fill="var(--surface, #fff)"/>
    <line x1="16" y1="10" x2="17" y2="10"/>
    <line x1="3" y1="15" x2="6" y2="15"/>
    <circle cx="8.5" cy="15" r="2.5" fill="var(--surface, #fff)"/>
    <line x1="11" y1="15" x2="17" y2="15"/>
  </svg>
);
