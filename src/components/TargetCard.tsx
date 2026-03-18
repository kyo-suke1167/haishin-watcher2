// src/components/TargetCard.tsx
import React from 'react';

export default function TargetCard({ target, onClick }: { target: any, onClick?: () => void }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${target.videoId}/hqdefault.jpg`;
  const youtubeUrl = `https://www.youtube.com/watch?v=${target.videoId}`;

  return (
    <div 
      onClick={onClick}
      // 💡 group クラスを追加して、ホバーアニメーションの連動をさせるわ！
      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer relative group"
    >
      {/* 🌟 大改造：サムネイル部分を a タグで囲んでリンクにする！ */}
      <a 
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // 💡 魔法のコード：ここを押した時は「カードのクリック(モーダル展開)」をキャンセルする！
        className="relative aspect-video block overflow-hidden"
      >
        <img 
          src={thumbnailUrl} 
          alt="Thumbnail" 
          // 💡 ホバーすると画像が少しズームするアニメーション！
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
        />
        
        {/* 💡 ホバーした時だけフワッと浮かび上がる再生ボタン（▶️）のオーバーレイ！ */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-5xl drop-shadow-lg filter hover:scale-110 transition-transform">▶️</span>
        </div>

        {/* 右下のステータスバッジ（LIVE/WAITING等）はそのまま */}
        <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-bold rounded-md bg-black/80 text-white shadow-sm border border-gray-600 z-10">
          {target.status === 'live' && <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>LIVE</span>}
          {target.status === 'waiting' && <span className="text-yellow-400">WAITING</span>}
          {target.status === 'completed' && <span className="text-gray-400">COMPLETED</span>}
        </div>
      </a>

      {/* テキスト情報（ここを押すとモーダルが開く） */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-100 line-clamp-2 mb-2 leading-snug hover:text-blue-400 transition-colors">
          {target.title || target.videoId}
        </h3>
        <p className="text-xs text-gray-500 mt-auto flex items-center gap-1">
          <span>🕒</span> {new Date(target.createdAt).toLocaleDateString('ja-JP')} 登録
        </p>
      </div>
    </div>
  );
}