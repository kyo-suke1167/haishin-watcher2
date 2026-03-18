import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🗑️ 指定されたチャンネルをレーダーから除外するAPI
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await prisma.channelTarget.delete({
      where: { id: resolvedParams.id }
    });
    return NextResponse.json({ message: 'レーダーから削除しました。' }, { status: 200 });
  } catch (error) {
    console.error('Channel Delete Error:', error);
    return NextResponse.json({ error: '削除に失敗しました。' }, { status: 500 });
  }
}