import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { formatEther } from 'viem';

const ESCROW_CONTRACT_ADDRESS = "0xfFEA4d8EbE310F7bc1D70ee58b3D27cfd3B6D9e7";

// 只需要用到的读取函数 ABI
const ABI = [
  {
    "inputs": [],
    "name": "projectCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
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
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function GET() {
  try {
    const client = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed.binance.org/')
    });

    const countBigInt = await client.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'projectCount'
    }) as bigint;
    
    const chainCount = Number(countBigInt);
    
    // 查找数据库中最新的 contractId
    // 注意：这里我们取 shortId 为数字最大的，避免字符串排序问题 (10 < 2)
    const allOrders = await prisma.order.findMany({
      select: { contractId: true }
    });
    
    let maxId = 0;
    allOrders.forEach(o => {
      if (o.contractId) {
        const num = Number(o.contractId);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    });

    const startId = maxId + 1;

    console.log(`[Sync] Chain: ${chainCount}, DB Max: ${maxId}, Start: ${startId}`);

    if (startId > chainCount) {
      return NextResponse.json({ message: "Already synced", count: chainCount });
    }

    let syncedCount = 0;

    for (let i = startId; i <= chainCount; i++) {
      try {
        const data = await client.readContract({
          address: ESCROW_CONTRACT_ADDRESS,
          abi: ABI,
          functionName: 'projects',
          args: [BigInt(i)]
        }) as any;

        const [
          buyerRaw, sellerRaw, tokenAddress, amount, sellerDeposit, 
          termsStr, duration, deadline, state
        ] = data;

        // 核心修复：强制转小写，防止 DB 唯一性冲突
        const buyerAddr = buyerRaw.toLowerCase();
        const sellerAddr = sellerRaw.toLowerCase();

        // 解析 terms
        let title = `Order #${i}`;
        let description = termsStr;
        try {
          const parsed = JSON.parse(termsStr);
          if (parsed.title) title = parsed.title;
          if (parsed.desc) description = parsed.desc;
        } catch (e) {
          console.log(`Order #${i} terms parsing failed, using raw string`);
        }

        const amountEth = formatEther(amount);
        
        // 确保天数是整数
        const days = Math.round(Number(duration) / 3600 / 24) || 1; 

        // 1. 创建/更新买家
        const buyerUser = await prisma.user.upsert({
          where: { walletAddress: buyerAddr },
          update: {},
          create: { walletAddress: buyerAddr, nickname: `User ${buyerAddr.slice(0,6)}` }
        });

        // 2. 创建/更新卖家
        const sellerUser = await prisma.user.upsert({
          where: { walletAddress: sellerAddr },
          update: {},
          create: { walletAddress: sellerAddr, nickname: `User ${sellerAddr.slice(0,6)}` }
        });

        // 3. 写入订单
        await prisma.order.upsert({
          where: { shortId: i.toString() },
          update: {
            status: "CREATED" // 如果是同步，先假设为 Created，后续可以用状态同步逻辑细化
          },
          create: {
            shortId: i.toString(),
            contractId: i.toString(),
            title: title.slice(0, 190), // 防止超长
            description: description,
            amount: amountEth,
            daysToDeliver: days,
            buyerId: buyerUser.id,
            sellerId: sellerUser.id,
            tokenSymbol: "USDT",
            status: "CREATED"
          }
        });
        
        syncedCount++;

      } catch (err) {
        console.error(`[Sync] Error syncing order #${i}:`, err);
        // 继续循环，不要因为一个失败就停止
      }
    }

    return NextResponse.json({ success: true, synced: syncedCount, total: chainCount });

  } catch (error: any) {
    console.error("[Sync API Critical Error]", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}
