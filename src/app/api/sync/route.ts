import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { bsc } from 'viem/chains';
import { formatEther } from 'viem';

// 你的合约地址
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
    // 1. 连接区块链
    const client = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed.binance.org/')
    });

    // 2. 获取链上总订单数
    const count = await client.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'projectCount'
    }) as bigint;
    
    const chainCount = Number(count);
    console.log(`[Sync] Chain count: ${chainCount}`);

    // 3. 获取数据库里最新的订单 ID
    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' }, // 这里的逻辑可以优化，最好是按 contractId 排序，但先简化
      select: { contractId: true }
    });

    let startId = 1;
    if (lastOrder && lastOrder.contractId) {
      startId = Number(lastOrder.contractId) + 1;
    }

    console.log(`[Sync] Starting sync from ID: ${startId} to ${chainCount}`);

    if (startId > chainCount) {
      return NextResponse.json({ message: "Already synced", count: chainCount });
    }

    let syncedCount = 0;

    // 4. 循环同步缺失的订单
    for (let i = startId; i <= chainCount; i++) {
      try {
        const idBigInt = BigInt(i);
        const data = await client.readContract({
          address: ESCROW_CONTRACT_ADDRESS,
          abi: ABI,
          functionName: 'projects',
          args: [idBigInt]
        }) as any;

        // 解构数据
        const [
          buyer, seller, tokenAddress, amount, sellerDeposit, 
          termsStr, duration, deadline, state
        ] = data;

        // 解析 Title 和 Description (因为我们在前端把它们 JSON.stringify 存进了 terms)
        let title = `Order #${i}`;
        let description = termsStr;
        try {
          const parsed = JSON.parse(termsStr);
          if (parsed.title) title = parsed.title;
          if (parsed.desc) description = parsed.desc;
        } catch (e) {
          // 如果不是 JSON，就直接用原始字符串
          console.log(`Order #${i} terms is not JSON`);
        }

        const amountEth = formatEther(amount); // 转换为可读数字 (USDT)

        // 5. 确保用户存在 (Prisma 的 upsert)
        await prisma.user.upsert({
          where: { walletAddress: buyer },
          update: {},
          create: { walletAddress: buyer, nickname: `User ${buyer.slice(0,6)}` }
        });

        await prisma.user.upsert({
          where: { walletAddress: seller },
          update: {},
          create: { walletAddress: seller, nickname: `User ${seller.slice(0,6)}` }
        });

        // 获取 User ID 用于关联
        const buyerUser = await prisma.user.findUnique({ where: { walletAddress: buyer } });
        const sellerUser = await prisma.user.findUnique({ where: { walletAddress: seller } });

        // 6. 创建订单
        await prisma.order.upsert({
          where: { shortId: i.toString() },
          update: {
            // 如果订单已存在，更新状态
            // 这里暂不处理复杂状态映射，主要为了创建
          },
          create: {
            shortId: i.toString(),
            contractId: i.toString(),
            title: title,
            description: description,
            amount: amountEth,
            daysToDeliver: Number(duration) / 3600, // 这里的逻辑根据你的业务调整，暂时存 raw hours
            buyerId: buyerUser!.id,
            sellerId: sellerUser!.id,
            tokenSymbol: "USDT",
            status: "CREATED" // 默认状态
          }
        });
        
        syncedCount++;
        console.log(`[Sync] Synced order #${i}`);

      } catch (err) {
        console.error(`[Sync] Failed to sync order #${i}`, err);
      }
    }

    return NextResponse.json({ success: true, synced: syncedCount, total: chainCount });

  } catch (error: any) {
    console.error("[Sync API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
