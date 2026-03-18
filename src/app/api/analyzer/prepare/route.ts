import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { analyzeChatData } from '@/lib/chatAnalyzer';

export async function POST(request: Request) {
  const { url, videoId, action } = await request.json();

  try {
    let targetVideoId = videoId;
    if (action === 'init' && url) {
      const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      targetVideoId = match ? match[1] : "unknown_video";
    }

    if (!targetVideoId) throw new Error("Video IDが不明です");

    const workDir = path.join(process.cwd(), 'tmp_analyzer', targetVideoId);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

    // 🎯 アクション1：メタデータ取得 ＆ 🌟既存データ自動検知！
    if (action === 'init') {
      const title = execSync(`yt-dlp --print "%(title)s" "https://youtu.be/${targetVideoId}"`).toString().trim() || "不明";
      const channel = execSync(`yt-dlp --print "%(uploader)s" "https://youtu.be/${targetVideoId}"`).toString().trim() || "不明";
      const desc = execSync(`yt-dlp --print "%(description)s" "https://youtu.be/${targetVideoId}"`).toString().trim();
      const meta = { title, channel, description: desc ? desc.substring(0, 500) + "..." : "なし", videoId: targetVideoId };
      fs.writeFileSync(path.join(workDir, 'meta.json'), JSON.stringify(meta));

      // 🌟 サーバー内にリアルタイム録音・取得データがあるかスキャン！
      let preloaded = { audio: false, chat: false };
      const files = fs.readdirSync(workDir);

      // 音声の検知と汎用化
      const liveAudio = files.find(f => f.startsWith('live_archive_') && !f.endsWith('.json'));
      if (liveAudio) {
        preloaded.audio = true;
        // APIが読み込みやすいように audio.拡張子 にコピーしておく
        const ext = path.extname(liveAudio);
        fs.copyFileSync(path.join(workDir, liveAudio), path.join(workDir, `audio${ext}`));
      }

      // チャットの検知と自動分析
      const liveChat = files.find(f => f.endsWith('.live_chat.json'));
      if (liveChat) {
        preloaded.chat = true;
        const rawChat = fs.readFileSync(path.join(workDir, liveChat), 'utf-8');
        const heatmap = analyzeChatData(rawChat); // 💸 スパチャ込みの分析を実行！
        fs.writeFileSync(path.join(workDir, 'chat_heatmap.txt'), heatmap);
      }

      return NextResponse.json({ success: true, videoId: targetVideoId, meta, preloaded });
    }

    // 🎯 アクション2：音声抽出（既存データがない場合のみ手動実行）
    if (action === 'audio') {
      const audioPath = path.join(workDir, 'audio.mp3');
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      execSync(`yt-dlp -x --audio-format mp3 -o "${audioPath}" "https://youtu.be/${targetVideoId}"`);
      return NextResponse.json({ success: true });
    }

    // 🎯 アクション3：チャット熱量分析（手動用）
    if (action === 'chat') {
      const files = fs.readdirSync(workDir);
      files.forEach(f => { if (f.startsWith('chat')) fs.unlinkSync(path.join(workDir, f)); });
      execSync(`yt-dlp --write-subs --sub-langs live_chat --skip-download -o "${path.join(workDir, 'chat')}" "https://youtu.be/${targetVideoId}"`);
      
      const newFiles = fs.readdirSync(workDir);
      const chatFile = newFiles.find(f => f.startsWith('chat') && f.endsWith('.json'));
      if (chatFile) {
        const rawChat = fs.readFileSync(path.join(workDir, chatFile), 'utf-8');
        const heatmap = analyzeChatData(rawChat);
        fs.writeFileSync(path.join(workDir, 'chat_heatmap.txt'), heatmap);
      }
      return NextResponse.json({ success: true });
    }

    // 🎯 アクション4：自動字幕（現状維持）
    if (action === 'autosub') {
      const files = fs.readdirSync(workDir);
      files.forEach(f => { if (f.startsWith('autosub')) fs.unlinkSync(path.join(workDir, f)); });
      try {
        execSync(`yt-dlp --write-auto-subs --sub-lang ja,en --skip-download -o "${path.join(workDir, 'autosub')}" "https://youtu.be/${targetVideoId}"`);
        return NextResponse.json({ success: true });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: "自動字幕が見つかりませんでした。" });
      }
    }

    return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}