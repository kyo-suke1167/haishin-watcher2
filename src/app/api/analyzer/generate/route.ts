import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';
import { analyzeChatData } from '@/lib/chatAnalyzer';

export async function POST(request: Request) {
  // 🌟 オプションに ccvFileName が追加されて送られてくるようになるわ！
  const { videoId, whisper, wankome, ccv, options } = await request.json();
  
  if (!videoId) return NextResponse.json({ error: 'Video IDが指定されていません' }, { status: 400 });
  const workDir = path.join(process.cwd(), 'tmp_analyzer', videoId);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEYが設定されていません！' }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  let uploadResult = null;

  try {
    console.log(`\n--- [V-Analyst] AIレポート生成開始 (${videoId}) ---`);
    let currentInfo = { title: "無題の配信", channel: "不明", description: "なし" };
    let currentExtractedChat = "";
    let autoSubText = "";

    if (fs.existsSync(path.join(workDir, 'meta.json'))) {
      currentInfo = JSON.parse(fs.readFileSync(path.join(workDir, 'meta.json'), 'utf-8'));
    }
    if (fs.existsSync(path.join(workDir, 'chat_heatmap.txt'))) {
      currentExtractedChat = fs.readFileSync(path.join(workDir, 'chat_heatmap.txt'), 'utf-8');
    }
    if (fs.existsSync(workDir)) {
      const files = fs.readdirSync(workDir);
      const subFile = files.find(f => f.startsWith('autosub') && f.endsWith('.vtt'));
      if (subFile) autoSubText = fs.readFileSync(path.join(workDir, subFile), 'utf-8');
    }

    let audioPath = "";
    if (fs.existsSync(workDir)) {
      const files = fs.readdirSync(workDir);
      const audioFile = files.find(f => f.startsWith('audio.'));
      if (audioFile) audioPath = path.join(workDir, audioFile);
    }

    if (options.useAudio && audioPath) {
      console.log(`☁️ 音声(${path.basename(audioPath)})をGeminiにアップロード中...`);
      const mimeType = audioPath.endsWith('.mp3') ? "audio/mp3" : audioPath.endsWith('.m4a') ? "audio/m4a" : "audio/webm";
      uploadResult = await fileManager.uploadFile(audioPath, { mimeType: mimeType, displayName: "Stream_Audio" });
    }

    const finalTranscript = whisper || autoSubText || "（字幕データなし）";
    const transcriptSource = whisper ? "高精度Whisper文字起こし" : (autoSubText ? "YouTube自動生成字幕" : "なし");

    // 🌟🌟🌟 CCVデータの直接読み込みロジック！ 🌟🌟🌟
    let finalCcvData = ccv || ""; // 手動ドロップデータがあればそれを使う
    if (options.useCcv && options.ccvFileName) {
      // サーバー内に指定されたファイル名があれば、直接読み込む！
      const ccvPath = path.join(process.cwd(), options.ccvFileName);
      if (fs.existsSync(ccvPath)) {
        finalCcvData = fs.readFileSync(ccvPath, 'utf-8');
        console.log(`📈 サーバー内のCSV [${options.ccvFileName}] を直接読み込みました！`);
      }
    }

    console.log(`🧠 データを融合してGemini(Flash-Latest)へ送信中... (字幕: ${transcriptSource})`);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    let promptText = `あなたはプロフェッショナルな配信アナリストです。
以下の【配信基本情報】と【配信書き起こしデータ全文（${transcriptSource}）】を精読し、配信全体の質を向上させるための詳細なビジネスレポートを作成してください。

【配信基本情報】
■チャンネル名: ${currentInfo.channel}
■配信タイトル: ${currentInfo.title}
■概要欄の抜粋: ${currentInfo.description}

【配信書き起こしデータ全文】
${finalTranscript} 

---
上記の情報に基づき、配信の流れ、リスナーとの温度感、企画の達成度を分析し、Markdown形式でレポートを出力してください。

## 配信総合分析レポート
### 1. 良かった点（撮れ高）
・（全編を通したハイライトや、企画が成功した要因を詳細に記載）
### 2. 課題点
・（全体のテンポ、タイトルとの乖離、配信画面の構成などを記載。※文字起こしの誤認識に関する指摘は不要）
### 3. リスナーエンゲージメント（チャットログ分析）
・（添付された熱量データや頻出キーワードに基づき、リスナーが熱狂した瞬間を分析して記載）
### 4. 次回に向けた具体的な改善案
・（データに基づいた具体的なアクションプラン、次回の企画案を提案）`;

    if (currentExtractedChat) promptText += `\n\n【追加データ: アーカイブチャット熱量分析】\n${currentExtractedChat}`;
    if (options.useWankome && wankome) promptText += `\n\n【追加データ: わんコメ熱量分析】\n${analyzeChatData(wankome)}`;
    
    // 🌟 読み込んだデータをプロンプトにねじ込む！
    if (options.useCcv && finalCcvData) promptText += `\n\n【追加データ: 同接・高評価 推移データ(CSV)】\n${finalCcvData}`;

    const contents: any[] = [];
    if (uploadResult) contents.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
    contents.push({ text: promptText });

    const result = await model.generateContent(contents);
    const report = result.response.text();

    console.log("✅ 解析完了！アーカイブに保存します。");
    try {
      const safeTitle = currentInfo.title.replace(/[\\/:*?"<>|]/g, '_') || "無題の配信";
      const archiveDir = path.join(process.cwd(), 'archives', safeTitle);
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

      if (finalTranscript) fs.writeFileSync(path.join(archiveDir, 'transcript.txt'), finalTranscript);
      if (report) fs.writeFileSync(path.join(archiveDir, 'analysis_report.md'), report);
      if (currentExtractedChat) fs.writeFileSync(path.join(archiveDir, 'chat_heatmap.txt'), currentExtractedChat);
      
      // 🌟 アーカイブフォルダにもCCVデータをコピーしてグラフを描画できるようにする！
      if (options.useCcv && finalCcvData) fs.writeFileSync(path.join(archiveDir, 'ccv_data.csv'), finalCcvData);
    } catch (saveErr) {}

    if (uploadResult) await fileManager.deleteFile(uploadResult.file.name).catch(()=>{});
    return NextResponse.json({ report: report });

  } catch (error: any) {
    console.error("❌ 解析エラー:", error.message);
    if (uploadResult) await fileManager.deleteFile(uploadResult.file.name).catch(()=>{});
    return NextResponse.json({ error: '解析中にエラーが発生しました。' }, { status: 500 });
  }
}