"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import StreamDashboard from "@/components/StreamDashboard";
import ChannelDashboard from "@/components/ChannelDashboard";
import AnalyzerDashboard from "@/components/AnalyzerDashboard"; // 🌟 追加！
import ArchiveDashboard from "@/components/ArchiveDashboard";

export default function Home() {
  const [activeView, setActiveView] = useState<'stream' | 'channel' | 'analyze' | 'archive'>('stream');

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans">
      
      {/* 🍔 左側のサイドバー */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* 📺 右側のメインコンテンツエリア */}
      <main className="flex-1 p-4 pt-16 md:pt-8 md:p-8 md:ml-64 transition-all duration-300">
        
        {/* Stateの中身に合わせて、表示するコンポーネントを切り替える！ */}
        {activeView === 'stream' && <StreamDashboard />}
        {activeView === 'channel' && <ChannelDashboard />}
        {activeView === 'analyze' && <AnalyzerDashboard />} {/* 🌟 追加！ */}
        {activeView === 'archive' && <ArchiveDashboard />} {/* 🌟 追加！ */}
        
      </main>

    </div>
  );
}