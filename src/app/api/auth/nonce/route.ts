import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma'; // 我们稍后会创建这个 lib

export async function POST(req: Request) {
  const { address } = await req.json();
  
  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const nonce = uuidv4();

  // 更新或创建用户 nonce
  await prisma.user.upsert({
    where: { walletAddress: address },
    update: { nonce },
    create: { walletAddress: address, nonce },
  });

  return NextResponse.json({ nonce });
}
