import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';
import { analyzeChatData } from '@/lib/chatAnalyzer';

export async function POST(request: Request) {
  const { whisper, wankome, ccv, options } = await request.json();
  const tmpDir = path.join(process.cwd(), 'tmp_analyzer');
  
  // 🌟 環境変数から安全にAPIキーを読み込む！
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEYが設定されていません！' }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  let uploadResult = null;

  try {
    console.log(`\n--- [V-Analyst] AIレポート生成開始 ---`);
    let currentInfo = { title: "無題の配信", channel: "不明", description: "なし" };
    let currentExtractedChat = "";

    if (fs.existsSync(path.join(tmpDir, 'temp_meta.json'))) {
      currentInfo = JSON.parse(fs.readFileSync(path.join(tmpDir, 'temp_meta.json'), 'utf-8'));
    }
    if (fs.existsSync(path.join(tmpDir, 'temp_chat_heatmap.txt'))) {
      currentExtractedChat = fs.readFileSync(path.join(tmpDir, 'temp_chat_heatmap.txt'), 'utf-8');
    }

    const audioPath = path.join(tmpDir, 'temp_audio.mp3');
    if (options.useAudio && fs.existsSync(audioPath)) {
      console.log("☁️ 音声をGeminiにアップロード中...");
      uploadResult = await fileManager.uploadFile(audioPath, { mimeType: "audio/mp3", displayName: "Stream_Audio" });
    }

    console.log(`🧠 データを融合してGeminiへ送信中...`);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // 最新モデルに合わせるわ！

    let promptText = `あなたはプロフェッショナルな配信アナリストです。
以下の【配信基本情報】と【配信書き起こしデータ全文】を精読し、配信全体の質を向上させるための詳細なビジネスレポートを作成してください。

【配信基本情報】
■チャンネル名: ${currentInfo.channel}
■配信タイトル: ${currentInfo.title}
■概要欄の抜粋: ${currentInfo.description}

【配信書き起こしデータ全文】
${whisper} 

---
上記の情報に基づき、配信の流れ、リスナーとの温度感、企画の達成度を分析し、Markdown形式でレポートを出力してください。

## 配信総合分析レポート
### 1. 良かった点（撮れ高）
・（全編を通したハイライトや、企画が成功した要因を詳細に記載）
### 2. 課題点
・（全体のテンポ、タイトルとの乖離、配信画面の構成、企画のルール設定などを記載）
※注意：文字起こしAI(Whisper)の誤認識に関する指摘は、ビジネスレポートとしては不要（ノイズ）であるため、絶対に課題点に含めないこと。

【重要：固有名詞の自己補完システム】
文字起こしデータには、固有名詞の誤認識が含まれています。添付された「頻出キーワード（チャット）」と文脈を照らし合わせ、あなた自身の推論によって正しい固有名詞（地名、ゲーム名、アイテム名など）に脳内変換した上で、極めて高精度なレポートを執筆してください。
### 3. リスナーエンゲージメント（チャットログ分析）
・（添付された「熱量データ」や「頻出キーワード」に基づき、リスナーが熱狂した瞬間や、一体感が生まれた要因を具体的に分析して記載）
### 4. 次回に向けた具体的な改善案
・（データに基づいた具体的なアクションプラン、次回の企画案を提案）`;

    if (options.useAudio) {
      promptText += `\n\n【追加指示: 音声データの取り扱い】\n添付された音声データは書き起こしテキストの「補助（裏付け）」として扱ってください。主軸はテキスト分析とし、音声（笑い声、間など）はシーンの魅力を補強するスパイスとして利用すること。`;
    }
    if (options.useWankome && wankome) {
      promptText += `\n\n【追加データ: わんコメチャットログ熱量分析】\n${analyzeChatData(wankome)}`;
    }
    if (options.useChatExtract && currentExtractedChat) {
      promptText += `\n\n【追加データ: アーカイブチャット熱量分析】\n${currentExtractedChat}`;
    }
    if (options.useCcv && ccv) {
        promptText += `\n\n【追加データ: 同時接続数・高評価の推移データ (CSV形式: 時間,同接数,高評価数)】\n${ccv}\n\n※このCSVデータに基づき、「どの時間帯・どのシーンで視聴者が最も集まり、どのタイミングで高評価が伸びたのか（リスナーの感情が動いた瞬間）」を具体的に分析レポートの『リスナーエンゲージメント』の項目に盛り込んでください。`;
      }

    const contents: any[] = [];
    if (uploadResult) {
      contents.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
    }
    contents.push({ text: promptText });

    const result = await model.generateContent(contents);
    const report = result.response.text();

    console.log("✅ 解析完了！アーカイブに保存します。");

    try {
      const safeTitle = currentInfo.title.replace(/[\\/:*?"<>|]/g, '_') || "無題の配信";
      const archiveDir = path.join(process.cwd(), 'archives', safeTitle);
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

      if (whisper) fs.writeFileSync(path.join(archiveDir, 'transcript.srt'), whisper);
      if (report) fs.writeFileSync(path.join(archiveDir, 'analysis_report.md'), report);
      if (currentExtractedChat) fs.writeFileSync(path.join(archiveDir, 'chat_heatmap.txt'), currentExtractedChat);
      if (options.useWankome && wankome) fs.writeFileSync(path.join(archiveDir, 'wankome_heatmap.txt'), analyzeChatData(wankome));
    } catch (saveErr) {
      console.log("⚠️ アーカイブの保存に失敗:", saveErr);
    }

    if (uploadResult) await fileManager.deleteFile(uploadResult.file.name).catch(()=>{});
    return NextResponse.json({ report: report });

  } catch (error: any) {
    console.error("❌ 解析エラー:", error.message);
    if (uploadResult) await fileManager.deleteFile(uploadResult.file.name).catch(()=>{});
    return NextResponse.json({ error: '解析中にエラーが発生しました。即時リトライ可能です。' }, { status: 500 });
  }
}