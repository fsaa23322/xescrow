import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const id = searchParams.get('id');

    // 1. 详情页查询逻辑
    if (id) {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { shortId: id },
            { contractId: id },
            { id: id }
          ]
        },
        include: {
          buyer: true,
          seller: true,
        }
      });
      
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      // 为了兼容前端可能的数组处理逻辑，这里返回数组
      return NextResponse.json([order]);
    }

    // 2. 列表页查询逻辑
    if (address) {
      // 关键修复：数据库存的是小写，查询时必须转小写
      const normalizedAddress = address.toLowerCase();

      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { buyer: { walletAddress: normalizedAddress } },
            { seller: { walletAddress: normalizedAddress } }
          ]
        },
        include: {
          buyer: true, // 包含买家信息
          seller: true, // 包含卖家信息
        },
        orderBy: {
          createdAt: 'desc' // 新订单排前面
        }
      });
      
      return NextResponse.json(orders);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
