import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId'); // shortId
    const readerAddress = searchParams.get('reader'); // 新增：当前查看者的地址

    if (!orderId) return NextResponse.json([]);

    // 1. 查找订单
    const order = await prisma.order.findUnique({
      where: { shortId: orderId },
      include: {
        messages: {
          include: { sender: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!order) return NextResponse.json([]);

    // 2. 核心逻辑：如果传入了查看者地址，将"别人发给我的"未读消息标记为已读
    if (readerAddress) {
      const normalizedReader = readerAddress.toLowerCase();
      
      // 找出所有：未读 + 发送者不是我 的消息 ID
      const unreadMsgIds = order.messages
        .filter(m => !m.isRead && m.sender.walletAddress.toLowerCase() !== normalizedReader)
        .map(m => m.id);

      if (unreadMsgIds.length > 0) {
        // 异步批量更新数据库，不阻塞当前返回
        await prisma.message.updateMany({
          where: { id: { in: unreadMsgIds } },
          data: { isRead: true }
        });
      }
    }

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

    const user = await prisma.user.findUnique({
      where: { walletAddress: senderAddress.toLowerCase() }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const order = await prisma.order.findUnique({
      where: { shortId: orderId }
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const message = await prisma.message.create({
      data: {
        content,
        orderId: order.id,
        senderId: user.id,
        isRead: false // 新消息默认为未读
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
