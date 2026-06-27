import React from 'react';
import GithubIcon from './icons/GithubIcon';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="text-center p-4 text-xs text-gray-400 mt-auto border-t border-white/5">
      GuterwAiCode {year} -
      <a
        href="https://github.com/Guterw"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 ml-1 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <GithubIcon className="w-4 h-4" />
        https://github.com/Guterw
      </a>
    </footer>
  );
}