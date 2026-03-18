import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { id, isRecordEnabled } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'IDが指定されていません' }, { status: 400 });
    }

    // データベースのフラグを更新！
    const updatedChannel = await prisma.channelTarget.update({
      where: { id },
      data: { isRecordEnabled }
    });

    return NextResponse.json({ success: true, channel: updatedChannel });
  } catch (error: any) {
    console.error('録音フラグ切り替えエラー:', error);
    return NextResponse.json({ success: false, error: '更新に失敗しました' }, { status: 500 });
  }
}