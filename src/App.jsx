import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from './contexts/LanguageContext';
import { GitHubRepoProvider } from './contexts/GitHubRepoContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatArea from './components/ChatArea';
import LanguageSelector from './components/LanguageSelector';
import WelcomeScreen from './components/WelcomeScreen';

function App() {
  const { lang, setLanguage } = useLanguage();

  if (!lang) return <LanguageSelector onSelect={setLanguage} />;

  return (
    <GitHubRepoProvider>
      <HashRouter>
        <div className="flex h-screen bg-[#0a0a0c]">
          <Sidebar />
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <TopBar />
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/chat/:id" element={<ChatArea />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </HashRouter>
    </GitHubRepoProvider>
  );
}

export default App;