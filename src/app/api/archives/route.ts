import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const archiveRoot = path.join(process.cwd(), 'archives');
    
    // フォルダがまだ無ければ空っぽで返す
    if (!fs.existsSync(archiveRoot)) {
      return NextResponse.json([]);
    }

    const folders = fs.readdirSync(archiveRoot);
    const archives = [];

    // 各配信ごとのフォルダを巡回してレポートを回収
    for (const folder of folders) {
      const folderPath = path.join(archiveRoot, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const reportPath = path.join(folderPath, 'analysis_report.md');
        let report = null;
        
        // レポートが存在すれば読み込む
        if (fs.existsSync(reportPath)) {
          report = fs.readFileSync(reportPath, 'utf-8');
          archives.push({
            title: folder.replace(/_/g, ' '), // アンダースコアをスペースに戻して見やすく
            report: report,
            // フォルダの作成日時を取得してソート用に使う
            createdAt: fs.statSync(folderPath).birthtime
          });
        }
      }
    }

    // 新しい順に並び替えて返す！
    archives.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json(archives, { status: 200 });
  } catch (error) {
    console.error("アーカイブ取得エラー:", error);
    return NextResponse.json({ error: 'アーカイブの取得に失敗しました' }, { status: 500 });
  }
}