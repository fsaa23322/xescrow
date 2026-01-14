'use client';
import { useEscrowActions, ProjectState } from '@/hooks/useXEscrow';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ActionPanelProps {
  order: any; contractData: any; isBuyer: boolean; isSeller: boolean; refetch: () => void;
}

export function ActionPanel({ order, contractData, isBuyer, isSeller, refetch }: ActionPanelProps) {
  const { confirmProject, depositFunds, submitWork, completeProject, approveToken, isPending } = useEscrowActions();
  const state = contractData?.state as ProjectState;
  const contractId = BigInt(order.contractId);

  const handleConfirm = async () => {
    try {
      if (contractData.sellerDeposit > 0n) {
        toast.info("需先授权质押金...");
        await approveToken(contractData.tokenAddress, order.amount);
      }
      await confirmProject(contractId);
      toast.success("已接单！"); refetch();
    } catch (e) { toast.error("操作失败"); }
  };

  const handleDeposit = async () => {
    try {
      toast.info("正在授权 USDT...");
      await approveToken(contractData.tokenAddress, order.amount.toString());
      toast.info("正在托管资金...");
      await depositFunds(contractId);
      toast.success("资金已托管！"); refetch();
    } catch (e) { toast.error("操作失败"); }
  };

  const handleSubmit = async () => {
    try { await submitWork(contractId); toast.success("工作已提交"); refetch(); } catch (e) { toast.error("操作失败"); }
  };
  const handleComplete = async () => {
    try { await completeProject(contractId); toast.success("交易完成"); refetch(); } catch (e) { toast.error("操作失败"); }
  };

  if (!contractData) return <div>加载链上数据中...</div>;

  return (
    <Card className="border-l-4 border-l-blue-600 shadow-md">
      <CardHeader><CardTitle className="text-lg">操作面板</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {state === ProjectState.Created && (
          <div className="space-y-3">
             <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>等待接单</AlertTitle><AlertDescription>{isSeller ? "请接单。" : "等待乙方接单..."}</AlertDescription></Alert>
            {isSeller && <Button onClick={handleConfirm} disabled={isPending} className="w-full">{isPending ? <Loader2 className="animate-spin" /> : "确认接单"}</Button>}
          </div>
        )}
        {state === ProjectState.Confirmed && (
          <div className="space-y-3">
             <Alert variant="default" className="bg-yellow-50 border-yellow-200"><Lock className="h-4 w-4 text-yellow-600" /><AlertTitle>等待托管</AlertTitle><AlertDescription>{isBuyer ? "请托管资金。" : "等待甲方托管..."}</AlertDescription></Alert>
            {isBuyer && <Button onClick={handleDeposit} disabled={isPending} className="w-full bg-yellow-600 hover:bg-yellow-700">{isPending ? <Loader2 className="animate-spin" /> : "托管资金 (USDT)"}</Button>}
          </div>
        )}
        {state === ProjectState.InProgress && (
          <div className="space-y-3">
             <Alert className="bg-blue-50 border-blue-200"><Loader2 className="h-4 w-4 text-blue-600 animate-spin-slow" /><AlertTitle>进行中</AlertTitle><AlertDescription>资金已锁定。</AlertDescription></Alert>
            {isSeller && <Button onClick={handleSubmit} disabled={isPending} className="w-full">{isPending ? <Loader2 className="animate-spin" /> : "提交工作"}</Button>}
          </div>
        )}
        {state === ProjectState.WorkSubmitted && (
          <div className="space-y-3">
             <Alert className="bg-green-50 border-green-200"><CheckCircle className="h-4 w-4 text-green-600" /><AlertTitle>已交稿</AlertTitle><AlertDescription>等待验收。</AlertDescription></Alert>
            {isBuyer && <Button onClick={handleComplete} disabled={isPending} className="w-full bg-green-600 hover:bg-green-700">{isPending ? <Loader2 className="animate-spin" /> : "验收通过"}</Button>}
          </div>
        )}
        {(state === ProjectState.Completed || state === ProjectState.Resolved) && <div className="p-4 bg-slate-100 rounded-lg text-center text-slate-500">交易已结束</div>}
      </CardContent>
    </Card>
  );
}
