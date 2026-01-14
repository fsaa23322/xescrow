import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId'); // 注意：这里前端传的是 orderId (shortId)

    if (!orderId) return NextResponse.json([]);

    // 1. 先通过 shortId 找到对应的 Order
    const order = await prisma.order.findUnique({
      where: { shortId: orderId },
      include: {
        messages: {
          include: {
            sender: true // 包含发送者信息以显示头像/地址
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!order) return NextResponse.json([]);

    return NextResponse.json(order.messages);
  } catch (error) {
    console.error("Get Msg Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, content, senderAddress } = body;

    if (!senderAddress) return NextResponse.json({ error: "No sender" }, { status: 401 });

    // 1. 找到用户
    const user = await prisma.user.findUnique({
      where: { walletAddress: senderAddress.toLowerCase() }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. 找到订单 (通过 shortId)
    const order = await prisma.order.findUnique({
      where: { shortId: orderId }
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 3. 创建消息
    const message = await prisma.message.create({
      data: {
        content,
        orderId: order.id, // 关联 UUID
        senderId: user.id
      },
      include: {
        sender: true
      }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Post Msg Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
