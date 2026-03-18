import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 📡 登録されているチャンネル一覧を取得するAPI
export async function GET() {
  try {
    const channels = await prisma.channelTarget.findMany({
      orderBy: { createdAt: "desc" }, // 新しい順
    });
    return NextResponse.json(channels, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "取得エラー" }, { status: 500 });
  }
}

// 🎯 新しいチャンネルをレーダーに登録するAPI
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url)
      return NextResponse.json({ error: "URLがありません" }, { status: 400 });

    let channelId = url.trim();
    const match = url.match(/(?:youtube\.com\/(?:@|channel\/))([^/?]+)/);
    if (match && match[1]) {
      channelId = url.includes("@") ? `@${match[1]}` : match[1];
    } else if (!channelId.startsWith("@") && !channelId.startsWith("UC")) {
      channelId = `@${channelId}`;
    }

    // 🌟 スクレイピングの極意：OGPタグから名前とアイコンを引っこ抜く！
    let channelName = channelId;
    let thumbnail = null;
    try {
      const targetUrl = `https://www.youtube.com/${channelId}`;
      const res = await fetch(targetUrl, { 
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ja-JP,ja;q=0.9",
        } 
      });
      const html = await res.text();
      
      // 💡 正規表現を少し緩くして、確実に引っこ抜く！
      const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/<link rel="image_src" href="([^"]+)"/i);
      
      if (nameMatch) {
        channelName = nameMatch[1].replace(' - YouTube', '');
      }
      if (imgMatch) thumbnail = imgMatch[1];
    } catch (e) {
      console.warn("アイコンの取得に失敗したけど、登録は続けるわ！");
    }

    // データベースに保存！
    const channel = await prisma.channelTarget.create({
      data: {
        channelId: channelId,
        name: channelName, // 🌟 本物の名前に！
        thumbnail: thumbnail, // 🌟 アイコン画像URLも保存！
      },
    });

    return NextResponse.json(
      { message: `${channelName} をレーダーに登録したわ！`, channel },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "既に登録されているわ！" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "登録に失敗しました。" },
      { status: 500 },
    );
  }
}
