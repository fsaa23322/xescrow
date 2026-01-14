import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS } from '@/lib/contracts';
import { toast } from 'sonner';

// --- 1. 补全 ProjectState 枚举 (对应合约) ---
export enum ProjectState {
  Created = 0,
  Confirmed = 1,
  InProgress = 2,
  WorkSubmitted = 3,
  Disputed = 4,
  Completed = 5,
  Resolved = 6,
  Cancelled = 7,
  Refunded = 8
}

// 简化的 ERC20 ABI 用于授权
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

export function useXEscrow() {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  const { 
    data: hash, 
    writeContract, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // --- 辅助：授权代币 (USDT) ---
  const approveToken = useCallback((tokenAddress: string, amountStr: string) => {
    if (!tokenAddress || !amountStr) {
      toast.error("授权参数缺失");
      return;
    }
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ESCROW_CONTRACT_ADDRESS, parseEther(amountStr)]
    });
  }, [writeContract]);

  // --- 核心：创建项目 (已修正参数顺序以匹配 XEscrowV3_9) ---
  // 合约顺序: createProject(_seller, _terms, _durationInHours, _tokenAddress, _amount, _sellerDeposit)
  const createProject = useCallback(async (
    title: string,
    amountStr: string,
    sellerAddress: string,
    tokenAddress: string, // 新增：必须传入代币地址
    durationDays: number = 3
  ) => {
    if (!title || !amountStr || !sellerAddress || !tokenAddress) {
      toast.error("请填写完整信息");
      return;
    }
    setIsLoading(true);
    try {
      writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createProject',
        args: [
          sellerAddress as `0x${string}`, // 1. _seller
          title,                          // 2. _terms
          BigInt(durationDays * 24),      // 3. _durationInHours
          tokenAddress as `0x${string}`,  // 4. _tokenAddress
          parseEther(amountStr),          // 5. _amount
          BigInt(0)                       // 6. _sellerDeposit
        ],
      });
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "创建失败");
      setIsLoading(false);
    }
  }, [writeContract]);

  // --- 核心：支付 (已移除 ETH value，改为 ERC20 逻辑) ---
  const depositFunds = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'depositFunds',
      args: [BigInt(projectId)],
    });
  }, [writeContract]);

  const confirmProject = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmProject',
      args: [BigInt(projectId)],
    });
  }, [writeContract]);

  const submitWork = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'submitWork',
      args: [BigInt(projectId)],
    });
  }, [writeContract]);

  const completeProject = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'completeProject',
      args: [BigInt(projectId)],
    });
  }, [writeContract]);

  return {
    createProject,
    confirmProject,
    depositFunds,
    submitWork,
    completeProject,
    approveToken,
    isLoading: isLoading || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash,
    error: writeError,
    // 2. 兼容旧代码的别名
    createEscrow: createProject, 
    payEscrow: depositFunds 
  };
}

// 3. 补全导出，修复构建报错
export const useEscrowActions = useXEscrow;
export const useProject = useXEscrow;
