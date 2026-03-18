import React, { useState } from 'react';

type SidebarProps = {
  activeView: 'stream' | 'channel' | 'analyze' | 'archive'; // 🌟 追加
  setActiveView: (view: 'stream' | 'channel' | 'analyze' | 'archive') => void;
};

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'stream', label: '🎯 単発監視 (スナイパー)', icon: '🌟' },
    { id: 'channel', label: '📡 自動監視 (レーダー)', icon: '🤖' },
    { id: 'analyze', label: '🧠 AI分析 (アナライザー)', icon: '🧠' }, 
    { id: 'archive', label: '🗄️ アーカイブ一覧', icon: '🗂️' }, // 🌟 追加！
  ] as const;

  return (
    <>
      {/* 📱 ハンバーガーボタン（スマホ・閉状態用） */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg hover:bg-gray-800 transition-colors md:hidden"
      >
        🍔
      </button>

      {/* 🌑 背景オーバーレイ（スマホで開いた時用） */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🗄️ サイドバー本体 */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400 tracking-wider">監視コンソール</h1>
          <p className="text-xs text-gray-500 mt-1">v2.0.0 Logger Edition</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsOpen(false); // スマホならメニューを閉じる
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
                activeView === item.id 
                  ? 'bg-blue-900/40 text-blue-400 border border-blue-800/50' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}