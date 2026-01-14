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

export function useXEscrow(projectId?: bigint) {
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

  const { data: projectRaw, refetch } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'projects',
    args: projectId ? [projectId] : undefined,
    query: { enabled: !!projectId }
  });

  let project = undefined;
  if (projectRaw && Array.isArray(projectRaw)) {
    const [
      buyer, seller, tokenAddress, amount, sellerDeposit, 
      terms, duration, deadline, state, 
      extensionProposedSeconds, extensionProposer, 
      confirmTime, workSubmittedTime
    ] = projectRaw as any;

    project = {
      buyer, seller, tokenAddress, amount, sellerDeposit, terms, duration, 
      deadline, state, extensionProposedSeconds, extensionProposer, 
      confirmTime, workSubmittedTime
    };
  }

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

  // 修复：新增 depositStr 参数，默认为 '0'
  const createProject = useCallback(async (
    title: string,
    amountStr: string,
    sellerAddress: string,
    tokenAddress: string,
    durationDays: number = 3,
    depositStr: string = '0' 
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
          parseEther(depositStr) // 这里不再硬编码为 0
        ],
      });
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "创建失败");
      setIsLoading(false);
    }
  }, [writeContract]);

  // 保持兼容 string | bigint
  const depositFunds = useCallback((id: string | bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'depositFunds',
      args: [BigInt(id.toString())],
    });
  }, [writeContract]);

  const confirmProject = useCallback((id: string | bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmProject',
      args: [BigInt(id.toString())],
    });
  }, [writeContract]);

  const submitWork = useCallback((id: string | bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'submitWork',
      args: [BigInt(id.toString())],
    });
  }, [writeContract]);

  const completeProject = useCallback((id: string | bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'completeProject',
      args: [BigInt(id.toString())],
    });
  }, [writeContract]);

  const overallLoading = isLoading || isWritePending || isConfirming;

  return {
    project, refetch,
    createProject, confirmProject, depositFunds, submitWork, completeProject, approveToken,
    isLoading: overallLoading, isPending: overallLoading, 
    isSuccess: isConfirmed, hash, error: writeError,
    createEscrow: createProject, payEscrow: depositFunds 
  };
}
export const useEscrowActions = useXEscrow;
export const useProject = useXEscrow;
export default useXEscrow;
