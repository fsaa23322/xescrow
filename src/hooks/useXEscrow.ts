import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, ERC20_ABI } from '@/lib/contracts';
import { parseEther } from 'viem';
import { useCallback } from 'react';

// 1. 定义状态枚举 (与合约保持一致)
export enum ProjectState {
  Created = 0,
  Confirmed = 1,     // 卖家已接单 (质押未付)
  InProgress = 2,    // 甲方已托管，进行中
  WorkSubmitted = 3, // 乙方已交稿
  Disputed = 4,      // 争议中
  Completed = 5,     // 完成
  Resolved = 6,      // 仲裁解决
  Cancelled = 7,     // 取消
  Refunded = 8       // 退款
}

// 2. 定义格式化后的数据接口
export interface ProjectData {
  id: string;
  buyer: string;
  seller: string;
  tokenAddress: string;
  amount: bigint;
  sellerDeposit: bigint;
  terms: string;
  duration: bigint;
  deadline: bigint;
  state: ProjectState;
  extensionProposedSeconds: bigint;
  extensionProposer: string;
  confirmTime: bigint;
  workSubmittedTime: bigint;
  isLoading: boolean;
  refetch: () => void;
}

// --- 读取 Hook: 获取单个订单详情 ---
export function useProject(projectId: bigint | undefined) {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'projects',
    args: projectId ? [projectId] : undefined,
    query: {
      enabled: !!projectId && projectId > 0n, // 只有 ID 有效时才查询
    }
  });

  // 数据格式化工厂
  const formattedData: ProjectData | null = data ? {
    id: projectId?.toString() || '0',
    buyer: data[0],
    seller: data[1],
    tokenAddress: data[2],
    amount: data[3],
    sellerDeposit: data[4],
    terms: data[5],
    duration: data[6],
    deadline: data[7],
    state: data[8] as ProjectState,
    extensionProposedSeconds: data[9],
    extensionProposer: data[10],
    confirmTime: data[11],
    workSubmittedTime: data[12],
    isLoading,
    refetch
  } : null;

  return { project: formattedData, isLoading, isError, refetch };
}

// --- 写入 Hook: 封装所有交互动作 ---
export function useEscrowActions() {
  const { writeContractAsync, isPending: isWritePending, data: hash } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 1. 创建订单 (甲方)
  const createProject = useCallback(async (
    seller: string,
    terms: string,
    durationHours: number,
    tokenAddress: string,
    amountStr: string,
    depositStr: string
  ) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'createProject',
      args: [
        seller as `0x${string}`,
        terms,
        BigInt(durationHours),
        tokenAddress as `0x${string}`,
        parseEther(amountStr),  // 自动处理 18位精度
        parseEther(depositStr)
      ],
    });
  }, [writeContractAsync]);

  // 2. 卖家接单 (乙方 - 需先授权)
  const confirmProject = useCallback(async (id: bigint) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmProject',
      args: [id],
    });
  }, [writeContractAsync]);

  // 3. 甲方托管资金 (甲方 - 需先授权)
  const depositFunds = useCallback(async (id: bigint) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'depositFunds',
      args: [id],
    });
  }, [writeContractAsync]);

  // 4. 提交工作 (乙方)
  const submitWork = useCallback(async (id: bigint) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'submitWork',
      args: [id],
    });
  }, [writeContractAsync]);

  // 5. 验收完成 (甲方)
  const completeProject = useCallback(async (id: bigint) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'completeProject',
      args: [id],
    });
  }, [writeContractAsync]);

  // 6. 发起仲裁 (任意一方)
  const raiseDispute = useCallback(async (id: bigint) => {
    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'raiseDispute',
      args: [id],
    });
  }, [writeContractAsync]);

  // 通用 ERC20 授权方法
  const approveToken = useCallback(async (tokenAddress: string, amountStr: string) => {
    return writeContractAsync({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ESCROW_CONTRACT_ADDRESS, parseEther(amountStr)],
    });
  }, [writeContractAsync]);

  return {
    createProject,
    confirmProject,
    depositFunds,
    submitWork,
    completeProject,
    raiseDispute,
    approveToken,
    isPending: isWritePending || isConfirming, // 只要是在写或在确认，都算 loading
    isSuccess,
    hash
  };
}
