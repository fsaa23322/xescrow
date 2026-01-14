import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyMessage } from 'viem';

const JWT_SECRET = process.env.JWT_SECRET || 'xescrow-secret-key-change-it';

export async function POST(req: Request) {
  const { address, signature } = await req.json();

  // 1. 查用户
  const user = await prisma.user.findUnique({
    where: { walletAddress: address },
  });

  if (!user || !user.nonce) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. 验证签名
  // 签名的内容通常是: "Welcome to XEscrow. Nonce: <nonce>"
  // 这里简化处理，假设前端只签了 nonce，商业级项目需遵循 EIP-4361
  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message: user.nonce, // 验证用户是否真的签了这个 nonce
    signature,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3. 验证通过，生成 JWT
  const token = jwt.sign({ userId: user.id, address: user.walletAddress }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // 4. 刷新 nonce (防止重放)
  await prisma.user.update({
    where: { id: user.id },
    data: { nonce: null }, 
  });

  // 5. 设置 HttpOnly Cookie
  const response = NextResponse.json({ success: true, user });
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
