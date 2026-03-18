import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

// 💡 修正ポイント：params を Promise として受け取り、await で開ける！
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // 👈 型を Promise に変更！
) {
  try {
    // 💡 修正ポイント：ここで await して中身を取り出す！
    const resolvedParams = await params;
    const targetId = resolvedParams.id;
    
    // 1. データベースから詳細データ（AIレポート含む）を取得
    const target = await prisma.streamTarget.findUnique({
      where: { id: targetId }
    });

    if (!target) {
      return NextResponse.json({ error: 'ターゲットが見つかりません。' }, { status: 404 });
    }

    // 2. CSVファイルから同接履歴を読み込んで、グラフ用（Recharts）のJSON配列に変換する！
    const ccvFile = path.join(process.cwd(), `ccv_${target.videoId}.csv`);
    let chartData: any[] = [];
    
    if (fs.existsSync(ccvFile)) {
      const csvText = fs.readFileSync(ccvFile, 'utf-8');
      const lines = csvText.trim().split('\n');
      
      chartData = lines.map(line => {
        const [timeJST, ccvStr, likesStr] = line.split(','); // 💡 JST時間, CCV, Likesの3列に分割！
        
        if (!timeJST || !ccvStr || !likesStr) return null;

        // 💡 時間の変換（JSTの文字列 "2026/3/18 10:00:00" から "HH:MM" を抽出）
        const timeLabel = timeJST.split(' ')[1].substring(0, 5); // "10:00" の部分を切り出す

        return {
          time: timeLabel,
          ccv: parseInt(ccvStr, 10) || 0,
          likes: parseInt(likesStr, 10) || 0, // 💡 Likesも数値として追加！
        };
      }).filter(Boolean);
    }

    // レポートとグラフのデータをセットにしてフロントエンドに返す！
    // 💡 ロガーモードなのでtarget.reportは空のはず。target自体はUI表示に使うからそのまま返すわ。
    return NextResponse.json({ target, chartData }, { status: 200 });

  } catch (error) {
    console.error('API Detailed Get Error:', error);
    return NextResponse.json({ error: 'データ取得に失敗しました。' }, { status: 500 });
  }
}

// 💡 新規追加：特定のターゲットをデータベースから物理削除するAPI
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const targetId = resolvedParams.id;

    await prisma.streamTarget.delete({
      where: { id: targetId }
    });

    return NextResponse.json({ message: '削除しました。' }, { status: 200 });
  } catch (error) {
    console.error('API Delete Error:', error);
    return NextResponse.json({ error: '削除に失敗しました。' }, { status: 500 });
  }
}