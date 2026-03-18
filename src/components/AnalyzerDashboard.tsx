"use client";
import React, { useState, useEffect } from 'react';

export default function AnalyzerDashboard() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [metaInfo, setMetaInfo] = useState<{title: string, channel: string} | null>(null);

  const [statusInit, setStatusInit] = useState("idle");
  const [statusAudio, setStatusAudio] = useState("idle");
  const [statusChat, setStatusChat] = useState("idle");
  const [statusSub, setStatusSub] = useState("idle");

  const [whisperData, setWhisperData] = useState("");
  const [wankomeData, setWankomeData] = useState("");
  const [ccvData, setCcvData] = useState("");
  const [useAudio, setUseAudio] = useState(false);

  const [ccvList, setCcvList] = useState<string[]>([]);
  const [selectedCcvFile, setSelectedCcvFile] = useState<string>("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState("");

  // 🌟 初回ロード時：URLパラメータ（?v=ID）があれば自動実行！
  useEffect(() => {
    fetch('/api/analyzer/ccv-list')
      .then(res => res.json())
      .then(data => { if (data.success) setCcvList(data.files); })
      .catch(e => console.error(e));

    // オートロード機能
    const searchParams = new URLSearchParams(window.location.search);
    const v = searchParams.get('v');
    if (v) {
      setUrl(`https://www.youtube.com/watch?v=${v}`);
      // ちょっと待ってから自動で確定ボタンを押したことにする
      setTimeout(() => runAction('init', setStatusInit, `https://www.youtube.com/watch?v=${v}`), 500);
    }
  }, []);

  const runAction = async (action: string, setStatus: any, targetUrl: string = url) => {
    setStatus("loading");
    try {
      const res = await fetch('/api/analyzer/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, videoId, action })
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        if (action === 'init') {
          setVideoId(data.videoId);
          setMetaInfo(data.meta);
          
          // CCVプルダウンの自動選択
          setCcvList(prevList => {
            const autoMatch = prevList.find(f => f.includes(data.videoId));
            if (autoMatch) setSelectedCcvFile(autoMatch);
            return prevList;
          });

          // 🌟 リアルタイムデータの自動検知＆UIスキップ！
          if (data.preloaded?.audio) {
            setStatusAudio("success");
            setUseAudio(true); // 自動で音声ONに！
          }
          if (data.preloaded?.chat) {
            setStatusChat("success"); // 自動でチャット取得済みに！
          }
        }
        if (action === 'audio') setUseAudio(true);
      } else {
        setStatus("error");
        alert(`エラー: ${data.error}`);
      }
    } catch (e) {
      setStatus("error");
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setReport("⏳ Geminiが脳みそをフル回転させてレポートを執筆中...");

    try {
      const res = await fetch('/api/analyzer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId, whisper: whisperData, wankome: wankomeData, ccv: ccvData,
          options: { 
            useAudio: useAudio && statusAudio === 'success', 
            useWankome: !!wankomeData, 
            useCcv: !!ccvData || !!selectedCcvFile,
            ccvFileName: selectedCcvFile 
          }
        })
      });
      const data = await res.json();
      setReport(data.report || data.error);
    } catch (e) {
      setReport("❌ 解析エラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'whisper' | 'wankome' | 'ccv') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (type === 'whisper') setWhisperData(content);
      else if (type === 'wankome') setWankomeData(content);
      else if (type === 'ccv') { setCcvData(content); setSelectedCcvFile(""); }
    };
    reader.readAsText(file);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="border-b border-purple-900 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-purple-400 tracking-wider">🧠 AI アナライザー</h1>
        <div className="text-sm text-purple-300 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-800">
          Hybrid Architecture Mode
        </div>
      </header>

      {/* Step 1 */}
      <section className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2"><span>1️⃣</span> Step 1: ターゲットの確定</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="🎬 配信のYouTube URLを貼り付けてください"
            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-purple-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={statusInit === 'loading' || statusInit === 'success'}
          />
          <button
            onClick={() => runAction('init', setStatusInit)}
            disabled={!url || statusInit === 'loading' || statusInit === 'success'}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {statusInit === 'loading' ? '⏳ 取得中...' : statusInit === 'success' ? '✅ 確定済' : '🎯 確定'}
          </button>
        </div>
        {metaInfo && (
          <div className="mt-4 p-4 bg-gray-800/50 border border-purple-500/30 rounded-lg text-sm flex justify-between items-center">
            <div>
              <p className="text-gray-400">チャンネル: <span className="font-bold text-white">{metaInfo.channel}</span></p>
              <p className="text-gray-400">タイトル: <span className="font-bold text-white">{metaInfo.title}</span></p>
            </div>
          </div>
        )}
      </section>

      {/* Step 2 */}
      {statusInit === 'success' && (
        <section className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2"><span>2️⃣</span> Step 2: 必要なデータの抽出</h2>
          
          <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div>
              <p className="font-bold text-blue-400">📝 YouTube自動字幕 (推奨)</p>
            </div>
            <button onClick={() => runAction('autosub', setStatusSub)} disabled={statusSub === 'loading' || statusSub === 'success'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50 w-32">
              {statusSub === 'loading' ? '⏳...' : statusSub === 'success' ? '✅ 完了' : '実行'}
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-lg border ${statusChat === 'success' ? 'bg-green-900/20 border-green-700/50' : 'bg-gray-800/50 border-gray-700'}`}>
            <div>
              <p className={`font-bold ${statusChat === 'success' ? 'text-green-300' : 'text-green-400'}`}>💬 アーカイブチャット (スパチャ抽出込)</p>
              {statusChat === 'success' && <p className="text-xs text-green-400 mt-1">✨ リアルタイム取得済みデータを検知しました！</p>}
            </div>
            <button onClick={() => runAction('chat', setStatusChat)} disabled={statusChat === 'loading' || statusChat === 'success'} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50 w-32">
              {statusChat === 'loading' ? '⏳...' : statusChat === 'success' ? '✅ 完了' : '実行'}
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-lg border ${statusAudio === 'success' ? 'bg-orange-900/20 border-orange-700/50' : 'bg-gray-800/50 border-gray-700'}`}>
            <div>
              <p className={`font-bold ${statusAudio === 'success' ? 'text-orange-300' : 'text-orange-400'}`}>🎙️ 音声抽出</p>
              {statusAudio === 'success' && <p className="text-xs text-orange-400 mt-1">✨ リアルタイム録音済みデータを検知しました！</p>}
            </div>
            <button onClick={() => runAction('audio', setStatusAudio)} disabled={statusAudio === 'loading' || statusAudio === 'success'} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50 w-32">
              {statusAudio === 'loading' ? '⏳...' : statusAudio === 'success' ? '✅ 完了' : '実行'}
            </button>
          </div>
        </section>
      )}

      {/* Step 3 */}
      {statusInit === 'success' && (
        <section className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2"><span>3️⃣</span> Step 3: 追加データ ＆ レポート生成</h2>
          <p className="text-sm text-gray-400 mb-4">準備が整いました。手動で高精度字幕を追加することも可能です。準備ができたら発射ボタンを押してください。</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div onDrop={(e) => handleDrop(e, 'whisper')} onDragOver={handleDragOver} className={`border-2 border-dashed rounded-xl p-4 text-center ${whisperData ? 'border-green-500 bg-green-900/20' : 'border-purple-500/50 bg-gray-800/50'}`}>
              <p className="text-gray-300 text-sm">📂 <b>高精度Whisper字幕</b></p>
              <span className={`text-xs font-bold ${whisperData ? 'text-green-400' : 'text-gray-500'}`}>{whisperData ? `✅ 手動読込済` : "未読込 (自動字幕を優先)"}</span>
            </div>
            <div onDrop={(e) => handleDrop(e, 'wankome')} onDragOver={handleDragOver} className={`border-2 border-dashed rounded-xl p-4 text-center ${wankomeData ? 'border-green-500 bg-green-900/20' : 'border-blue-500/50 bg-gray-800/50'}`}>
              <p className="text-gray-300 text-sm">💬 <b>わんコメログ</b> (任意)</p>
            </div>
            <div className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col justify-center ${(ccvData || selectedCcvFile) ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500/50 bg-gray-800/50'}`}>
              <p className="text-gray-300 text-sm mb-2">📈 <b>同接・高評価 (.csv)</b></p>
              <select className="bg-gray-950 border border-gray-600 text-gray-300 text-xs rounded-md px-2 py-2 w-full mb-2" value={selectedCcvFile} onChange={(e) => { setSelectedCcvFile(e.target.value); setCcvData(""); }}>
                <option value="">サーバー内から選ぶ...</option>
                {ccvList.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-6 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <label className={`flex items-center gap-3 cursor-pointer ${statusAudio === 'success' ? 'text-white' : 'text-gray-500'}`}>
              <input type="checkbox" checked={useAudio} onChange={(e) => setUseAudio(e.target.checked)} disabled={statusAudio !== 'success'} className="w-5 h-5 accent-orange-500" />
              🎙️ 抽出・録音した音声データをAIに聞かせる
            </label>
          </div>

          {/* 🌟 人間が手動でトリガーを引くための「発射ボタン」 */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg text-lg tracking-widest"
          >
            {isAnalyzing ? "🚀 AIが脳みそフル回転でレポート執筆中..." : "🚀 3. 解析を実行する！(発射)"}
          </button>
        </section>
      )}

      {report && (
        <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl shadow-lg mt-8">
          <h3 className="text-lg font-bold text-emerald-400 mb-4"><span>📄</span> AI アナライザー神レポート</h3>
          <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-sm">{report}</pre>
        </section>
      )}
    </div>
  );
}