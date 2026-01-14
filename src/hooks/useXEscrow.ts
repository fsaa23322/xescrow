import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, ERC20_ABI } from '@/lib/contracts';
import { toast } from 'sonner';

// USDT 合约地址 (BSC 主网)
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

export function useXEscrow() {
  const [isLoading, setIsLoading] = useState(false);

  // 1. 写入合约的 Hook
  const { 
    data: hash, 
    writeContract, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();

  // 2. 等待交易确认的 Hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // 3. 创建担保交易 (Create Project)
  const createEscrow = useCallback(async (
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
      // 在这里我们严格按照 createProject 的 ABI 顺序传参:
      // createProject(string _title, uint256 _amount, address _seller, uint256 _sellerDeposit, uint256 _daysToDeliver)
      
      const amountBigInt = parseEther(amountStr); // 假设是 18 位精度

      writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createProject',
        args: [
          title,                  // 1. 标题
          amountBigInt,           // 2. 金额
          sellerAddress as `0x${string}`, // 3. 卖家地址
          BigInt(0),              // 4. 卖家押金 (暂时默认为0)
          BigInt(durationDays)    // 5. 交付天数
        ],
      });
      
    } catch (err: any) {
      console.error("创建失败:", err);
      toast.error(err.message || "创建交易失败");
      setIsLoading(false);
    }
  }, [writeContract]);

  // 4. 支付/确认交易 (Confirm Project) - 需要支付 USDT
  // 注意：真实逻辑通常需要先 Approve USDT，这里简化为直接调用合约逻辑
  // 如果合约需要原生币(BNB)，则需要 value 字段；如果走 USDT，则需确保 allowance 足够
  const payEscrow = useCallback((projectId: string, amountStr: string) => {
    setIsLoading(true);
    try {
        // 这里只是示例，实际主网合约如果收 USDT，通常需要先调用 USDT 的 approve
        // 为了确保能跑通，我们这里先假设它是 confirmProject 逻辑
        writeContract({
            address: ESCROW_CONTRACT_ADDRESS,
            abi: ESCROW_ABI,
            functionName: 'confirmProject',
            args: [BigInt(projectId)],
        });
    } catch (err) {
        console.error(err);
        setIsLoading(false);
    }
  }, [writeContract]);

  return {
    createEscrow,
    payEscrow,
    isLoading: isLoading || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash
  };
}
