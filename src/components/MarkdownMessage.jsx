import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Você pode escolher outros temas importando de 'react-syntax-highlighter/dist/esm/styles/prism'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; 

function MarkdownMessage({ content }) {
  return (
    <div className="text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // AQUI ESTÁ A MÁGICA DO ESPAÇAMENTO:
          // whitespace-pre-wrap garante que as quebras de linha da IA sejam respeitadas
          // mb-5 garante o respiro entre os blocos
          p: ({ node, ...props }) => <p className="mb-5 whitespace-pre-wrap leading-relaxed" {...props} />,
          
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-5 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-5 space-y-2" {...props} />,
          li: ({ node, ...props }) => <li className="text-gray-200" {...props} />,
          
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-blue-400" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-blue-400" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-blue-300" {...props} />,
          
          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-100" {...props} />,
          
          // Tabelas agora não precisam de estilização de scrollbar aqui, o CSS global já cuida disso!
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-gray-800 border border-gray-700 rounded-lg" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 bg-[#111115] text-left text-sm font-semibold text-gray-200 uppercase tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props} />
          ),

          // Códigos
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            
            if (!inline && match) {
              return (
                <div className="mt-4 mb-6 rounded-md overflow-hidden border border-gray-700 bg-[#0d0d0d]">
                  <div className="bg-[#111115] text-gray-400 px-4 py-1.5 text-xs font-mono uppercase border-b border-gray-700">
                    {match[1]}
                  </div>
                  {/* O overflow-x-auto aqui vai usar a barra de rolagem do index.css */}
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            
            return (
              <code className="bg-gray-800 text-purple-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          
          a: ({ node, ...props }) => (
            <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}