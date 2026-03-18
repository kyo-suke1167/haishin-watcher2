"use client";
import React, { useState } from 'react';

export default function AnalyzerDashboard() {
  const [url, setUrl] = useState("");
  
  // 🌟 修正：事故防止のため、初期値はすべて false（チェックなし）に！
  const [useAudio, setUseAudio] = useState(false);
  const [useChatExtract, setUseChatExtract] = useState(false);

  // 🌟 修正：WankomeとCCVのチェックボックス用ステートは「引き算」で削除！

  const [whisperData, setWhisperData] = useState("");
  const [wankomeData, setWankomeData] = useState("");
  const [ccvData, setCcvData] = useState("");
  
  const [whisperFileName, setWhisperFileName] = useState("");
  const [wankomeFileName, setWankomeFileName] = useState("");
  const [ccvFileName, setCcvFileName] = useState("");

  const [isPrepared, setIsPrepared] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");
  const [report, setReport] = useState("");

  const handlePrepare = async () => {
    if (!url) { alert("URLを入力してください"); return; }
    setIsPreparing(true);
    setStatusMsg("⏳ yt-dlpでデータを引っこ抜いています... (数分かかる場合があります)");

    try {
      const res = await fetch('/api/analyzer/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options: { useAudio, useChatExtract } })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("✅ データ抽出完了！下の「Step 2」に進んでください。");
        setIsPrepared(true);
      } else {
        setStatusMsg("❌ 抽出エラー: " + data.error);
      }
    } catch (e) {
      setStatusMsg("❌ サーバー通信エラー。");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setReport("⏳ Geminiが脳みそをフル回転させてレポートを執筆中...\n※エラーで止まっても、抽出済みデータがあるためこのボタンから即リトライ可能です！");

    try {
      const res = await fetch('/api/analyzer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whisper: whisperData,
          wankome: wankomeData,
          ccv: ccvData,
          // 🌟 修正：データが入っているか（文字列の長さが0より大きいか）を判定して自動でフラグを立てる！
          options: { 
            useAudio, 
            useChatExtract, 
            useWankome: !!wankomeData, 
            useCcv: !!ccvData 
          }
        })
      });
      const data = await res.json();
      setReport(data.report || data.error);
    } catch (e) {
      setReport("❌ 解析エラー。もう一度「レポート生成を開始！」を押してリトライしてください。");
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
      if (type === 'whisper') {
        setWhisperData(content);
        setWhisperFileName(file.name);
      } else if (type === 'wankome') {
        setWankomeData(content);
        setWankomeFileName(file.name);
      } else if (type === 'ccv') {
        setCcvData(content);
        setCcvFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="border-b border-purple-900 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-purple-400 tracking-wider">🧠 AI アナライザー</h1>
        <div className="text-sm text-purple-300 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-800">Model: Gemini 1.5 Flash</div>
      </header>

      {/* Step 1: データ抽出 */}
      <section className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2"><span>1️⃣</span> Step 1: データの抽出と準備 (yt-dlp)</h2>
        <input
          type="text"
          placeholder="🎬 配信のYouTube URLを貼り付けてください"
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-purple-500 mb-4"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="bg-gray-800/50 p-4 rounded-lg mb-4 space-y-3 border border-gray-700">
          <h3 className="text-sm font-bold text-purple-400">🧩 抽出オプション</h3>
          <label className="flex items-center gap-3 cursor-pointer text-gray-300 hover:text-white">
            {/* 🌟 初期値falseにしたから、最初はチェックが外れているわ！ */}
            <input type="checkbox" checked={useAudio} onChange={(e) => setUseAudio(e.target.checked)} className="w-5 h-5 accent-purple-500" />
            🎙️ 音声抽出 (数分かかります)
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-gray-300 hover:text-white">
            <input type="checkbox" checked={useChatExtract} onChange={(e) => setUseChatExtract(e.target.checked)} className="w-5 h-5 accent-purple-500" />
            🪄 アーカイブチャット抽出＆熱量分析 (長時間の配信は時間がかかります)
          </label>
        </div>
        <button
          onClick={handlePrepare}
          disabled={isPreparing || !url}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPreparing ? "⚙️ 抽出中..." : "⚙️ 1. 抽出を開始する"}
        </button>
        {statusMsg && <div className="mt-4 text-center font-bold text-yellow-400">{statusMsg}</div>}
      </section>

      {/* Step 2: AI分析 */}
      <section className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2"><span>2️⃣</span> Step 2: AIレポート生成 (Gemini)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            onDrop={(e) => handleDrop(e, 'whisper')}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${whisperData ? 'border-green-500 bg-green-900/20' : 'border-purple-500/50 bg-gray-800/50'}`}
          >
            <p className="text-gray-300 mb-2">📂 <b>Whisper字幕 (.srt/.vtt)</b><br/>をドロップ (必須)</p>
            <span className={`text-sm font-bold ${whisperData ? 'text-green-400' : 'text-gray-500'}`}>
              {whisperFileName ? `✅ ${whisperFileName}` : "未読み込み"}
            </span>
          </div>

          <div
            onDrop={(e) => handleDrop(e, 'wankome')}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${wankomeData ? 'border-green-500 bg-green-900/20' : 'border-blue-500/50 bg-gray-800/50'}`}
          >
            <p className="text-gray-300 mb-2">💬 <b>わんコメログ (.json)</b><br/>をドロップ (任意)</p>
            <span className={`text-sm font-bold ${wankomeData ? 'text-green-400' : 'text-gray-500'}`}>
              {wankomeFileName ? `✅ ${wankomeFileName}` : "未読み込み"}
            </span>
          </div>

          <div
            onDrop={(e) => handleDrop(e, 'ccv')}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${ccvData ? 'border-green-500 bg-green-900/20' : 'border-orange-500/50 bg-gray-800/50'}`}
          >
            <p className="text-gray-300 mb-2">📈 <b>同接・高評価 (.csv)</b><br/>をドロップ (任意)</p>
            <span className={`text-sm font-bold ${ccvData ? 'text-green-400' : 'text-gray-500'}`}>
              {ccvFileName ? `✅ ${ccvFileName}` : "未読み込み"}
            </span>
          </div>
        </div>

        {/* 🌟 修正：あの野暮ったいチェックボックスは完全に消し去ったわ！ */}

        <button
          onClick={handleAnalyze}
          disabled={!isPrepared || !whisperData || isAnalyzing}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isAnalyzing ? "🚀 生成中..." : "🚀 2. レポート生成を開始！"}
        </button>
      </section>

      {/* 分析結果 */}
      {report && (
        <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-emerald-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>📄</span> AI アナライザー神レポート
          </h3>
          <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-sm">
            {report}
          </pre>
        </section>
      )}
    </div>
  );
}