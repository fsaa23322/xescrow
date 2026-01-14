import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, ERC20_ABI } from '@/lib/contracts';
import { toast } from 'sonner';

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

// 修改 Hook 定义，允许传入可选的 projectId
export function useXEscrow(projectId?: bigint) {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  // --- 写操作 (Write) ---
  const { 
    data: hash, 
    writeContract, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // --- 读操作 (Read) ---
  // 从链上读取项目详情
  const { data: projectRaw, refetch } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'projects',
    args: projectId ? [projectId] : undefined,
    query: {
      enabled: !!projectId, // 只有当 projectId 存在时才查询
    }
  });

  // 将数组格式的返回值转换为对象格式
  let project = undefined;
  if (projectRaw && Array.isArray(projectRaw)) {
    const [
      buyer, 
      seller, 
      tokenAddress, 
      amount, 
      sellerDeposit, 
      terms, 
      duration, 
      deadline, 
      state, 
      extensionProposedSeconds, 
      extensionProposer, 
      confirmTime, 
      workSubmittedTime
    ] = projectRaw as any;

    project = {
      buyer, 
      seller, 
      tokenAddress, 
      amount, 
      sellerDeposit, 
      terms, 
      duration, 
      deadline, 
      state, 
      extensionProposedSeconds, 
      extensionProposer, 
      confirmTime, 
      workSubmittedTime
    };
  }

  // --- 动作函数 ---
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

  const createProject = useCallback(async (
    title: string,
    amountStr: string,
    sellerAddress: string,
    tokenAddress: string,
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
          sellerAddress as `0x${string}`,
          title,
          BigInt(durationDays * 24),
          tokenAddress as `0x${string}`,
          parseEther(amountStr),
          BigInt(0)
        ],
      });
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "创建失败");
      setIsLoading(false);
    }
  }, [writeContract]);

  const depositFunds = useCallback((projectIdStr: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'depositFunds',
      args: [BigInt(projectIdStr)],
    });
  }, [writeContract]);

  const confirmProject = useCallback((projectIdStr: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmProject',
      args: [BigInt(projectIdStr)],
    });
  }, [writeContract]);

  const submitWork = useCallback((projectIdStr: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'submitWork',
      args: [BigInt(projectIdStr)],
    });
  }, [writeContract]);

  const completeProject = useCallback((projectIdStr: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'completeProject',
      args: [BigInt(projectIdStr)],
    });
  }, [writeContract]);

  const overallLoading = isLoading || isWritePending || isConfirming;

  return {
    // 读数据
    project,
    refetch,
    
    // 写操作
    createProject,
    confirmProject,
    depositFunds,
    submitWork,
    completeProject,
    approveToken,
    
    // 状态
    isLoading: overallLoading,
    isPending: overallLoading, 
    isSuccess: isConfirmed,
    hash,
    error: writeError,
    
    // 别名兼容
    createEscrow: createProject, 
    payEscrow: depositFunds 
  };
}

export const useEscrowActions = useXEscrow;
export const useProject = useXEscrow;
export default useXEscrow;
