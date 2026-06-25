import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'; // Adicionamos Navigate
import { useLanguage } from './contexts/LanguageContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LanguageSelector from './components/LanguageSelector';
import Footer from './components/Footer';
import WelcomeScreen from './components/WelcomeScreen';

function App() {
  const { lang, setLanguage } = useLanguage();

  if (!lang) return <LanguageSelector onSelect={setLanguage} />;

  return (
    <HashRouter>
      <div className="flex h-screen flex-col bg-[#0a0a0c]"> {/* Cor de fundo consistente */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              {/* Opção 1: Se quiser uma tela de boas-vindas */}
              <Route path="/" element={<div className="flex items-center justify-center h-full text-gray-500">Selecione um chat ou crie um novo</div>} />
              
              {/* Rota do Chat */}
              <Route path="/chat/:id" element={<ChatArea />} />
              
              {/* Redirecionamento de segurança */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;