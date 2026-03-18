"use client";
import React, { useState, useEffect } from 'react';

export default function ArchiveDashboard() {
  const [archives, setArchives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const res = await fetch('/api/archives');
        if (res.ok) {
          const data = await res.json();
          setArchives(data);
        }
      } catch (error) {
        console.error("アーカイブ取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchives();
  }, []);

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="mb-10 border-b border-yellow-900 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">🗄️ 過去のレポート (アーカイブ)</h1>
        <div className="text-sm text-yellow-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
          Total: {archives.length} reports
        </div>
      </header>

      {isLoading ? (
        <div className="text-center text-gray-500 py-20">
          <span className="text-4xl animate-spin inline-block mb-4">⚙️</span>
          <p>アーカイブを読み込み中...</p>
        </div>
      ) : archives.length === 0 ? (
        <div className="bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-12 text-center text-gray-500">
          <span className="text-5xl mb-4 inline-block">🗂️</span>
          <p>まだ保存されたレポートはありません。<br/>AIアナライザーで分析を実行すると、ここに自動的に蓄積されます。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archives.map((archive, index) => (
            <div key={index} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden transition-all shadow-lg">
              {/* アコーディオンのヘッダー */}
              <button 
                onClick={() => setOpenId(openId === archive.title ? null : archive.title)}
                className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3 truncate pr-4">
                  <span className="text-2xl">📄</span>
                  <span className="font-bold text-gray-200 truncate">{archive.title}</span>
                </div>
                <span className="text-yellow-500 text-xl font-bold shrink-0">
                  {openId === archive.title ? '−' : '＋'}
                </span>
              </button>
              
              {/* アコーディオンの中身（レポート本文） */}
              {openId === archive.title && (
                <div className="p-6 bg-gray-950 border-t border-gray-800">
                  <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-sm">
                    {archive.report}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}