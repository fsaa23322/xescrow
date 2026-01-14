import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const id = searchParams.get('id');

    // 1. 详情页
    if (id) {
      const order = await prisma.order.findFirst({
        where: { OR: [{ shortId: id }, { contractId: id }, { id: id }] },
        include: { buyer: true, seller: true }
      });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      return NextResponse.json([order]);
    }

    // 2. 列表页
    if (address) {
      const normalizedAddress = address.toLowerCase();

      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { buyer: { walletAddress: normalizedAddress } },
            { seller: { walletAddress: normalizedAddress } }
          ]
        },
        include: {
          buyer: true,
          seller: true,
          // 取最新一条消息
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { sender: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json(orders);
    }

    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
