import React from 'react';
import { Languages, ChevronRight } from 'lucide-react';
import Flags from 'country-flag-icons/react/3x2';
import Footer from './Footer';

export default function LanguageSelector({ onSelect }) {
  const languages = [
    { code: 'pt', name: 'Português', countryCode: 'BR' },
    { code: 'en', name: 'English', countryCode: 'US' },
    { code: 'es', name: 'Español', countryCode: 'ES' },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#0a0a0c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0c] to-[#0a0a0c]"></div>

      <div className="relative p-8 rounded-3xl border border-white/10 bg-[#121212] backdrop-blur-xl shadow-2xl w-96 text-center">
        
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
            <Languages className="text-blue-400" size={32} />
          </div>
        </div>

        <h2 className="text-white text-lg font-light tracking-widest mb-8 uppercase">
          Select Language
        </h2>

        <div className="flex flex-col gap-3 mb-8">
          {languages.map((lang) => {
            const FlagIcon = Flags[lang.countryCode];
            return (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className="group flex items-center justify-between px-6 py-4 rounded-xl border border-white/5 bg-[#1a1a1a] hover:bg-[#252525] hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-6">
                  <FlagIcon className="w-7 h-5 rounded-sm object-cover" title={lang.countryCode} />
                  <span className="text-gray-200 font-medium">{lang.name}</span>
                </div>
                <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400" />
              </button>
            );
          })}
        </div>

        <Footer />
      </div>
    </div>
  );
}