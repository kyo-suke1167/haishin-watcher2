// src/app/api/targets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // さっき作った召喚陣

// 💡 1号機から継承した、URLからVideo IDだけを抜き出す魔法の関数
function extractVideoId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input)) return input;
  const match = input.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}

// クライアント（画面）からPOSTリクエストを受け取る関数
export async function POST(request: Request) {
    try {
      const body = await request.json();
      const { url } = body;
  
      // 1. Video IDを抽出
      const videoId = extractVideoId(url);
      if (!videoId) {
        return NextResponse.json({ error: '❌ 有効なYouTube URLではありません！' }, { status: 400 });
      }
  
      // 2. データベースに既に存在するかチェック
      const existingTarget = await prisma.streamTarget.findUnique({
        where: { videoId },
      });
  
      if (existingTarget) {
        return NextResponse.json({ message: '⚠️ そのIDは既に監視リストに登録されています。', target: existingTarget }, { status: 200 });
      }
  
      // 🌟 3. ここから新規追加！YouTube APIを叩いてタイトルを取得する！
      let title = null;
      const apiKey = process.env.YOUTUBE_API_KEY; // .envから鍵を取り出す
      
      if (apiKey) {
        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
          const ytRes = await fetch(ytUrl);
          const ytData = await ytRes.json();
          
          if (ytData.items && ytData.items.length > 0) {
            title = ytData.items[0].snippet.title; // タイトルを引っこ抜く！
          }
        } catch (ytError) {
          console.error("YouTube API Fetch Error:", ytError);
          // タイトル取得に失敗しても、システムが止まらないようにエラーは握りつぶすわ！
        }
      } else {
        console.warn("⚠️ YOUTUBE_API_KEY が .env に設定されていません！");
      }
  
      // 4. データベースに新規登録（titleも一緒に保存！）
      const newTarget = await prisma.streamTarget.create({
        data: {
          videoId: videoId,
          title: title, // 👈 取得したタイトルをここに入れる！
          status: 'waiting',
        },
      });
  
      return NextResponse.json({ message: `✅ 「${title || videoId}」の監視を開始しました！`, target: newTarget }, { status: 201 });
  
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。' }, { status: 500 });
    }
  }

export async function GET() {
  try {
    // データベースから、登録された日時（createdAt）の新しい順に全て取得！
    const targets = await prisma.streamTarget.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(targets, { status: 200 });
  } catch (error) {
    console.error("API Get Error:", error);
    return NextResponse.json(
      { error: "データ取得に失敗しました。" },
      { status: 500 },
    );
  }
}
