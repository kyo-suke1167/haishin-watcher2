import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // サーバーのルートディレクトリ（プロセス起動位置）からファイル一覧を取得
    const files = fs.readdirSync(process.cwd());
    
    // ccv_ で始まり .csv で終わるファイルだけを抽出！
    const ccvFiles = files
      .filter(f => f.startsWith('ccv_') && f.endsWith('.csv'))
      .map(f => {
        // 更新日時を取得してソートに使うわ
        const stats = fs.statSync(path.join(process.cwd(), f));
        return {
          filename: f,
          mtime: stats.mtime.getTime()
        };
      })
      // 新しいファイルが一番上に来るように並び替え！
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.filename);

    return NextResponse.json({ success: true, files: ccvFiles });
  } catch (error: any) {
    console.error('CCVリスト取得エラー:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}