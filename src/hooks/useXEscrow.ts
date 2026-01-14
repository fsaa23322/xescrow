import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, ERC20_ABI } from '@/lib/contracts';
import { toast } from 'sonner';

// 1. 补全 ProjectState 导出
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

  // 授权代币 (USDT等)
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

  // 创建订单 - 修正参数顺序以匹配 XEscrowV3_9
  // Solidity: (address _seller, string _terms, uint256 _durationInHours, address _tokenAddress, uint256 _amount, uint256 _sellerDepositAmount)
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
          sellerAddress as `0x${string}`, // _seller
          title,                          // _terms
          BigInt(durationDays * 24),      // _durationInHours (将天数转换为小时)
          tokenAddress as `0x${string}`,  // _tokenAddress
          parseEther(amountStr),          // _amount
          BigInt(0)                       // _sellerDepositAmount (暂时默认为0)
        ],
      });
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "创建失败");
      setIsLoading(false);
    }
  }, [writeContract]);

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

  // 计算总的加载状态
  const overallLoading = isLoading || isWritePending || isConfirming;

  return {
    createProject,
    confirmProject,
    depositFunds,
    submitWork,
    completeProject,
    approveToken,
    isLoading: overallLoading,
    isPending: overallLoading, 
    isSuccess: isConfirmed,
    hash,
    error: writeError,
    createEscrow: createProject, 
    payEscrow: depositFunds 
  };
}

// 2. 补全默认导出和别名导出，确保其他组件引用不报错
export const useEscrowActions = useXEscrow;
export const useProject = useXEscrow;
export default useXEscrow;
