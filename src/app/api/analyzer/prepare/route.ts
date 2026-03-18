import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { analyzeChatData } from '@/lib/chatAnalyzer';

export async function POST(request: Request) {
  const { url, options } = await request.json();
  
  // 🌟 Next.js環境に合わせて、作業用フォルダをプロジェクト直下の「tmp_analyzer」にする！
  const tmpDir = path.join(process.cwd(), 'tmp_analyzer');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  try {
    console.log(`\n--- [V-Analyst] データ抽出開始 ---`);
    let currentInfo = { title: "不明", channel: "不明", description: "なし" };

    console.log("📝 1. メタデータ取得中...");
    try {
      currentInfo.title = execSync(`yt-dlp --print "%(title)s" "${url}"`).toString().trim() || "不明";
      currentInfo.channel = execSync(`yt-dlp --print "%(uploader)s" "${url}"`).toString().trim() || "不明";
      const desc = execSync(`yt-dlp --print "%(description)s" "${url}"`).toString().trim();
      currentInfo.description = desc ? desc.substring(0, 500) + "..." : "なし";
    } catch (e) { 
      console.log("⚠️ メタデータ取得失敗:", e); 
    }

    const audioPath = path.join(tmpDir, 'temp_audio.mp3');
    if (options.useAudio) {
      console.log("🎙️ 2. 音声データ抽出中...");
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      execSync(`yt-dlp -x --audio-format mp3 -o "${audioPath}" "${url}"`);
    }

    let currentExtractedChat = "";
    if (options.useChatExtract) {
      console.log("🪄 3. アーカイブチャット抽出＆熱量分析中...");
      try {
        const files = fs.readdirSync(tmpDir);
        files.forEach(file => { if (file.startsWith('temp_chat')) fs.unlinkSync(path.join(tmpDir, file)); });

        execSync(`yt-dlp --write-subs --sub-langs live_chat --skip-download -o "${path.join(tmpDir, 'temp_chat')}" "${url}"`);
        
        const newFiles = fs.readdirSync(tmpDir);
        const chatFile = newFiles.find(file => file.startsWith('temp_chat') && file.endsWith('.json'));
        
        if (chatFile) {
          const rawChat = fs.readFileSync(path.join(tmpDir, chatFile), 'utf-8');
          currentExtractedChat = analyzeChatData(rawChat); // 🌟 ここでさっき作った神関数を通す！
        }
      } catch (e) { console.log("⚠️ チャット抽出失敗"); }
    }

    fs.writeFileSync(path.join(tmpDir, 'temp_meta.json'), JSON.stringify(currentInfo));
    if (currentExtractedChat) {
      fs.writeFileSync(path.join(tmpDir, 'temp_chat_heatmap.txt'), currentExtractedChat);
    }

    console.log(`✅ [V-Analyst] 抽出完了！`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ 抽出エラー:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}