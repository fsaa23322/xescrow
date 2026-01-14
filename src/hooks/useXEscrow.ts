import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS } from '@/lib/contracts';
import { toast } from 'sonner';

// 1. 补回丢失的枚举 (Enums)
export enum ProjectState {
  Created = 0,
  Confirmed = 1,
  Deposited = 2,
  WorkSubmitted = 3,
  Completed = 4,
  Disputed = 5,
  Resolved = 6,
  Cancelled = 7
}

// 2. 主 Hook (包含所有功能)
export function useXEscrow() {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  // 写入合约的基础 Hook
  const { 
    data: hash, 
    writeContract, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();

  // 等待确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // --- 核心功能：创建项目 (修复了之前的类型错误) ---
  const createProject = useCallback(async (
    title: string,
    amountStr: string,
    sellerAddress: string,
    durationDays: number = 3
  ) => {
    if (!title || !amountStr || !sellerAddress) {
      toast.error("请填写完整信息");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Creating project:", { title, amountStr, sellerAddress });
      
      writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createProject',
        args: [
          title,                          // _title (string)
          parseEther(amountStr),          // _amount (uint256 -> bigint)
          sellerAddress as `0x${string}`, // _seller (address)
          BigInt(0),                      // _sellerDeposit (uint256 -> bigint)
          BigInt(durationDays)            // _daysToDeliver (uint256 -> bigint)
        ],
      });
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "创建失败");
      setIsLoading(false);
    }
  }, [writeContract]);

  // --- 其他功能 (对应 useEscrowActions) ---
  const confirmProject = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmProject',
      args: [BigInt(projectId)],
    });
  }, [writeContract]);

  const depositFunds = useCallback((projectId: string) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'depositFunds',
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

  // 返回所有需要的属性
  return {
    createProject,
    confirmProject,
    depositFunds,
    submitWork,
    completeProject,
    isLoading: isLoading || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash,
    // 为了兼容旧代码，这里也可以把函数再暴露一次
    createEscrow: createProject, 
    payEscrow: confirmProject 
  };
}

// 3. 补回丢失的别名导出 (Aliases)
// 这样其他文件 import { useEscrowActions } 时就不会报错了
export const useEscrowActions = useXEscrow;
export const useProject = useXEscrow; // 简化处理，暂时复用同一个 hook
