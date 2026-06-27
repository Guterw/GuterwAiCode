import React from 'react';
import GitHubConnector from './GitHubConnector';

export default function TopBar() {
  return (
    <header className="h-16 shrink-0 flex items-center justify-end px-6 border-b border-white/5 bg-[#0a0a0c]">
      <GitHubConnector />
    </header>
  );
}