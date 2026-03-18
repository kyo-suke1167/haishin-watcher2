"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import StreamDashboard from "@/components/StreamDashboard";
import ChannelDashboard from "@/components/ChannelDashboard";

export default function Home() {
  // 💡 どの画面を表示するかを管理するState（初期値はスナイパーモード）
  const [activeView, setActiveView] = useState<'stream' | 'channel'>('stream');

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans">
      
      {/* 🍔 左側のサイドバー */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* 📺 右側のメインコンテンツエリア */}
      {/* md:ml-64 でPC画面の時はサイドバーの幅(64=16rem=256px)だけ左に余白を空ける */}
      <main className="flex-1 p-4 pt-16 md:pt-8 md:p-8 md:ml-64 transition-all duration-300">
        
        {/* Stateの中身に合わせて、表示するコンポーネントを切り替える魔法！ */}
        {activeView === 'stream' && <StreamDashboard />}
        {activeView === 'channel' && <ChannelDashboard />}
        
      </main>

    </div>
  );
}