import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, formatEther } from 'viem';
import { bsc } from 'viem/chains';

const ESCROW_CONTRACT_ADDRESS = "0xfFEA4d8EbE310F7bc1D70ee58b3D27cfd3B6D9e7";

const ABI = [
  {
    "inputs": [], "name": "projectCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "projects",
    "outputs": [
      {"internalType": "address", "name": "buyer", "type": "address"},
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "address", "name": "tokenAddress", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "sellerDeposit", "type": "uint256"},
      {"internalType": "string", "name": "terms", "type": "string"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint256", "name": "extensionProposedSeconds", "type": "uint256"},
      {"internalType": "address", "name": "extensionProposer", "type": "address"},
      {"internalType": "uint256", "name": "confirmTime", "type": "uint256"},
      {"internalType": "uint256", "name": "workSubmittedTime", "type": "uint256"}
    ],
    "stateMutability": "view", "type": "function"
  }
] as const;

export async function GET() {
  try {
    const client = createPublicClient({ chain: bsc, transport: http('https://bsc-dataseed.binance.org/') });
    const countBigInt = await client.readContract({ address: ESCROW_CONTRACT_ADDRESS, abi: ABI, functionName: 'projectCount' }) as bigint;
    const chainCount = Number(countBigInt);

    const allOrders = await prisma.order.findMany({ select: { contractId: true } });
    let maxId = 0;
    allOrders.forEach(o => { if (o.contractId) { const num = Number(o.contractId); if (!isNaN(num) && num > maxId) maxId = num; } });

    // 我们不仅要同步新的，还要检查“旧订单”的状态是否更新了。
    // 为了性能，我们只检查最近 20 个未完成的订单，或者我们可以简单点，每次都检查所有状态 < 5 (未完成) 的订单。
    // 这里简化逻辑：如果是第一次同步，从 startId 开始；否则，我们额外检查所有 active 的订单。
    
    // 1. 同步新订单
    const startId = maxId + 1;
    for (let i = startId; i <= chainCount; i++) {
       await syncSingleOrder(i, client);
    }

    // 2. 更新已有订单状态 (这是“自动刷新”的核心)
    const activeOrders = await prisma.order.findMany({
      where: { chainState: { lt: 5 } }, // 小于 5 的都是未结束的
      select: { contractId: true, chainState: true }
    });

    for (const order of activeOrders) {
      if (order.contractId) {
         await syncSingleOrder(Number(order.contractId), client);
      }
    }

    return NextResponse.json({ success: true, total: chainCount });
  } catch (error: any) {
    console.error("[Sync Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncSingleOrder(id: number, client: any) {
    try {
        const data = await client.readContract({
          address: ESCROW_CONTRACT_ADDRESS, abi: ABI, functionName: 'projects', args: [BigInt(id)]
        }) as any;

        const [
          buyerRaw, sellerRaw, token, amount, deposit, 
          termsStr, duration, deadline, stateRaw
        ] = data;

        const newState = Number(stateRaw);
        const buyerAddr = buyerRaw.toLowerCase();
        const sellerAddr = sellerRaw.toLowerCase();

        // 查找数据库里现有的记录
        const existing = await prisma.order.findUnique({ where: { shortId: id.toString() } });

        let lastActionBy = existing?.lastActionBy;

        // 如果状态发生了变化，判断是谁操作的
        if (existing && existing.chainState !== newState) {
           if (newState === 1) lastActionBy = sellerAddr; // 0->1: Seller confirmed
           else if (newState === 2) lastActionBy = buyerAddr; // 1->2: Buyer deposited
           else if (newState === 3) lastActionBy = sellerAddr; // 2->3: Seller submitted
           else if (newState === 5) lastActionBy = buyerAddr; // 3->5: Buyer completed
           // 其他状态暂且不论
        }

        // 解析 Title
        let title = `Order #${id}`;
        let description = termsStr;
        try {
          const parsed = JSON.parse(termsStr);
          if (parsed.title) title = parsed.title;
          if (parsed.desc) description = parsed.desc;
        } catch (e) {}

        const amountEth = formatEther(amount);
        const days = Math.round(Number(duration) / 3600 / 24) || 1; 

        // 确保用户存在
        const buyerUser = await prisma.user.upsert({
          where: { walletAddress: buyerAddr }, update: {}, create: { walletAddress: buyerAddr, nickname: `User ${buyerAddr.slice(0,4)}` }
        });
        const sellerUser = await prisma.user.upsert({
          where: { walletAddress: sellerAddr }, update: {}, create: { walletAddress: sellerAddr, nickname: `User ${sellerAddr.slice(0,4)}` }
        });

        // 更新或创建订单
        await prisma.order.upsert({
          where: { shortId: id.toString() },
          update: {
            chainState: newState, // 更新状态
            lastActionBy: lastActionBy // 更新操作人
          },
          create: {
            shortId: id.toString(),
            contractId: id.toString(),
            title: title.slice(0, 190),
            description: description,
            amount: amountEth,
            daysToDeliver: days,
            buyerId: buyerUser.id,
            sellerId: sellerUser.id,
            chainState: newState,
            lastActionBy: buyerAddr, // 创建者是 buyer
            status: "CREATED"
          }
        });
    } catch (e) {
        console.error(`Sync error on #${id}`, e);
    }
}
