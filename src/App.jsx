import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from './contexts/LanguageContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LanguageSelector from './components/LanguageSelector';
import WelcomeScreen from './components/WelcomeScreen';

function App() {
  const { lang, setLanguage } = useLanguage();

  if (!lang) return <LanguageSelector onSelect={setLanguage} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#0a0a0c]">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/chat/:id" element={<ChatArea />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
