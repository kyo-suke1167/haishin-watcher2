import "dotenv/config";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const failCounts: Record<string, number> = {};

// 💡 戻り値を { ccv, likes } のオブジェクトに変更！
async function fetchMetrics(videoId: string): Promise<{ ccv: number; likes: number } | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });

    const html = response.data;

    // 🚨 待機所（予告編）ブロック！
    if (!html.includes('"isLiveNow":true')) {
      return null;
    }

    // 🎯 1. 同接数（CCV）の抽出
    let ccv = 0;
    const ccvMatch1 = html.match(/"concurrentViewNum":\{"simpleText":"([\d,]+)"\}/);
    const ccvMatch2 = html.match(/"text":"([\d,]+)\s*(人が視聴中|watching)/);
    const ccvMatch3 = html.match(/"viewCount":\{"runs":\[\{"text":"([\d,]+)"\}/);
    const ccvMatch = ccvMatch1 || ccvMatch2 || ccvMatch3;

    if (ccvMatch && ccvMatch[1]) {
      ccv = parseInt(ccvMatch[1].replace(/,/g, ""), 10);
    }

    // 🎯 2. 高評価数（Likes）の抽出！
    let likes = 0;
    const likeMatch1 = html.match(/"likeCount":"(\d+)"/);
    const likeMatch2 = html.match(/"label":"([\d,]+)\s*(件の高く評価|likes)"/);
    
    if (likeMatch1 && likeMatch1[1]) {
      likes = parseInt(likeMatch1[1], 10);
    } else if (likeMatch2 && likeMatch2[1]) {
      likes = parseInt(likeMatch2[1].replace(/,/g, ""), 10);
    }

    // 同接が取れていれば成功とみなす
    if (ccv > 0) {
      return { ccv, likes };
    }

    return null;
  } catch (error) {
    console.error(`[Watcher] ❌ 通信エラー (${videoId})`);
    return null;
  }
}

// 👁️ 監視ループのメインロジック
async function watchStreams() {
  console.log(
    `\n[Watcher] 👁️ ${new Date().toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo" })} - 監視サイクル開始...`,
  );

  try {
    const targets = await prisma.streamTarget.findMany({
      where: { status: { in: ["waiting", "live"] } },
    });

    if (targets.length === 0) {
      console.log("[Watcher] 💤 現在監視すべきターゲットはありません。");
      return;
    }

    for (const target of targets) {
      console.log(`[Watcher] 🔍 ターゲット確認中: ${target.title || target.videoId}`);

      const metrics = await fetchMetrics(target.videoId);

      if (metrics !== null) {
        console.log(`  👉 🔴 配信中！ 同接: ${metrics.ccv}人 / 高評価: ${metrics.likes}`);

        if (target.status === "waiting") {
          await prisma.streamTarget.update({
            where: { id: target.id },
            data: { status: "live" },
          });
          console.log(`  🔄 ステータスを「配信中」に更新しました。`);
        }

        // 🌟 時間のズレを修正！完璧な日本時間（JST）で記録！
        const nowJST = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        
        // 🌟 ファイル名を「ccv_動画ID_タイトル.csv」にする安全設計
        const safeTitle = (target.title || "無題の配信").replace(/[\\/:*?"<>|]/g, '_');
        const newLogFileName = `ccv_${target.videoId}_${safeTitle}.csv`;
        const newLogFile = path.join(process.cwd(), newLogFileName);

        // 💡 古い名前（IDのみ）のファイルが残っていたら、新しい名前に自動でリネーム！
        const oldLogFile = path.join(process.cwd(), `ccv_${target.videoId}.csv`);
        if (fs.existsSync(oldLogFile)) {
          fs.renameSync(oldLogFile, newLogFile);
          console.log(`  🔄 ログファイルをリネームしました: ${newLogFileName}`);
        }
        
        // 🌟 フォーマット変更：「時間, 同接数, 高評価数」で記録！
        fs.appendFileSync(newLogFile, `${nowJST},${metrics.ccv},${metrics.likes}\n`);

        failCounts[target.videoId] = 0;
      } else {
        if (target.status === "live") {
          failCounts[target.videoId] = (failCounts[target.videoId] || 0) + 1;

          if (failCounts[target.videoId] >= 3) {
            console.log(`  👉 ✅ 配信終了を確認！（3回連続ロスト）`);

            await prisma.streamTarget.update({
              where: { id: target.id },
              data: { status: "completed" },
            });

            delete failCounts[target.videoId]; 

            // Discordへシンプルな記録完了通知を飛ばす！
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (webhookUrl) {
              axios.post(webhookUrl, {
                content: `✅ **【配信ウォッチャー2号機】監視完了！**\n**ターゲット:** ${target.title || target.videoId}\n同接と高評価のロギングが無事に終わったわ！CSVファイルを確認してちょうだい！`,
              }).catch(() => {});
            }

          } else {
            console.log(`  👉 ⚠️ データ取得失敗（${failCounts[target.videoId]}/3回目）。`);
          }
        } else {
          console.log(`  👉 ⏳ まだ配信が始まっていません（待機中）。`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error("[Watcher] ❌ 監視ループで致命的なエラー:", error);
  }
}

// 📡 レーダー機能：チャンネルの配信開始を自動検知するサブルーチン！
async function radarSweep() {
  console.log(`\n[Radar] 📡 ${new Date().toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo" })} - レーダーによるチャンネル自動スキャン開始...`);

  try {
    const channels = await prisma.channelTarget.findMany();
    if (channels.length === 0) return;

    for (const channel of channels) {
      try {
        // 💡 極意：「/live」エンドポイントを叩いて、配信枠に飛ぶかチェック！
        const url = `https://www.youtube.com/${channel.channelId}/live`;
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ja-JP,ja;q=0.9",
          },
        });

        const html = response.data;

        // 配信中（isLiveNow:true）か確認！
        if (html.includes('"isLiveNow":true')) {
          // 💡 HTMLの中から「canonical（正規URL）」を探して VideoID を引っこ抜く！
          const match = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)">/);
          if (match && match[1]) {
            const videoId = match[1];

            // すでに監視リスト（スナイパー）に登録されているか確認
            const existing = await prisma.streamTarget.findUnique({ where: { videoId } });
            
            if (!existing) {
              // タイトルも引っこ抜く
              const titleMatch = html.match(/<title>([^<]+)<\/title>/);
              const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : videoId;

              console.log(`[Radar] 🚨 ターゲット発見！ ${channel.name} が配信を開始したわ！ (${videoId})`);
              
              // 🌟 自動で監視リスト（StreamTarget）にぶち込む！
              await prisma.streamTarget.create({
                data: {
                  videoId: videoId,
                  title: title,
                  status: 'live' // 最初からliveにして即座に同接ロギングを開始させる！
                }
              });

              // Discordに「自動スナイプ成功」の通知を飛ばす！
              const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
              if (webhookUrl) {
                axios.post(webhookUrl, {
                  content: `🚨 **【レーダー自動検知】**\n**${channel.name}** が配信を開始したため、監視リストに自動追加し、ロギングを開始したわ！\n▶️ **タイトル:** ${title}\n🔗 https://youtu.be/${videoId}`
                }).catch(() => {});
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Radar] ❌ ${channel.name} のスキャン中にエラー発生`);
      }
      
      // YouTubeに怒られないように、1チャンネルごとに2秒待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("[Radar] ❌ レーダーループで致命的なエラー:", error);
  }
}

// ---------------------------------------------------------
// 🚀 起動処理（更新）
// ---------------------------------------------------------
console.log("🟢 [配信ウォッチャー2号機 ワーカー] ロガー＆レーダーモードで起動しました。");

// 初回実行
watchStreams();
radarSweep();

// 1分ごとに同接ロギング（スナイパー）
setInterval(watchStreams, 60000);

// 5分ごとに新配信の自動検知（レーダー）
setInterval(radarSweep, 5 * 60000);