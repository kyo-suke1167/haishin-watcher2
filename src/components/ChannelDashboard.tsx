"use client";
import React, { useState, useEffect } from "react";

export default function ChannelDashboard() {
  const [url, setUrl] = useState("");
  const [channels, setChannels] = useState<any[]>([]);

  // チャンネル一覧を取得
  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error("チャンネル取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // チャンネル登録処理
  const handleAddChannel = async () => {
    if (!url) return alert("YouTubeチャンネルのURLかIDを入力してちょうだい！");
    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) alert(data.error);
      else {
        alert(data.message);
        setUrl("");
        fetchChannels();
      }
    } catch (error) {
      alert("通信エラーが発生しました。");
    }
  };

  // チャンネル削除処理
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("このチャンネルをレーダーから除外しますか？")) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchChannels();
    } catch (error) {
      alert("削除に失敗しました。");
    }
  };

  // 🎙️ 録音スイッチを切り替える関数
  const toggleRecordTarget = async (id: string, currentStatus: boolean) => {
    try {
      // オプティミスティックUI（APIの返事を待たずに画面だけ先に切り替えてサクサク感を出す！）
      setChannels(channels.map(ch => ch.id === id ? { ...ch, isRecordEnabled: !currentStatus } : ch));

      const res = await fetch('/api/channels/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRecordEnabled: !currentStatus })
      });
      
      if (!res.ok) {
        throw new Error('更新失敗');
      }
    } catch (error) {
      alert("スイッチの切り替えに失敗しました！");
      fetchChannels(); // 失敗したらサーバーの正しいデータを取り直して元に戻す
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-10 border-b border-emerald-900 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-emerald-400 tracking-wider">
          🤖 チャンネル自動監視 (レーダー)
        </h1>
        <div className="text-sm text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
          Radar: Active
        </div>
      </header>

      {/* 登録セクション */}
      <section className="bg-gray-900/50 p-6 rounded-xl shadow-2xl border border-emerald-900/50 mb-10 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4 text-emerald-300 flex items-center gap-2">
          <span>📡</span> 新規チャンネルをレーダーに登録
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="例: https://www.youtube.com/@okamimio または @okamimio"
            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-emerald-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={handleAddChannel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap"
          >
            レーダーに追加
          </button>
        </div>
      </section>

      {/* 登録済みチャンネル一覧 */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-300 border-l-4 border-emerald-500 pl-3">
          🌐 監視対象のチャンネル一覧
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {channels.length === 0 ? (
            <div className="col-span-full bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
              <span className="text-4xl mb-4">💤</span>
              <p>現在レーダーに登録されているチャンネルはありません。</p>
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-4 hover:border-emerald-500/50 transition-colors group shadow-lg"
              >
                {/* カード上部：チャンネル情報と削除ボタン */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 overflow-hidden w-full pr-1">
                    {/* 🌟🌟🌟 アイコン表示ロジックを完璧に復活！ 🌟🌟🌟 */}
                    {channel.thumbnail ? (
                      <img
                        src={channel.thumbnail}
                        alt={channel.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-600 shadow-inner"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl shrink-0 border border-gray-600 shadow-inner">
                        📺
                      </div>
                    )}
                    <div className="truncate pr-2 w-full">
                      <p className="font-bold text-gray-200 truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {channel.channelId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteChannel(channel.id)}
                    className="w-8 h-8 rounded-full bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="レーダーから削除"
                  >
                    ✕
                  </button>
                </div>

                {/* カード下部：究極の狙撃（録音）トグルスイッチ！ */}
                <div className="flex items-center justify-between bg-gray-900/60 p-2.5 rounded-lg border border-gray-700/50">
                  <label className="flex items-center cursor-pointer group w-full justify-between">
                    <span className={`text-xs font-bold transition-colors ${channel.isRecordEnabled ? 'text-orange-400' : 'text-gray-500'}`}>
                      {channel.isRecordEnabled ? '🎙️ 録音＆解析' : '📊 ロギングのみ'}
                    </span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={channel.isRecordEnabled || false}
                        onChange={() => toggleRecordTarget(channel.id, channel.isRecordEnabled || false)}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${channel.isRecordEnabled ? 'bg-orange-600' : 'bg-gray-600'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${channel.isRecordEnabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                  </label>
                </div>

              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}