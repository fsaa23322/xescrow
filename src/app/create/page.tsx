'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Clock, Coins } from 'lucide-react';
import { useEscrowActions } from '@/hooks/useXEscrow';

const DEFAULT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"; 

export default function CreateOrderPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createProject, isPending, isSuccess, hash } = useEscrowActions();

  const [formData, setFormData] = useState({
    title: '', description: '', sellerAddress: '', amount: '',
    deposit: '0', duration: '24', token: 'USDT'
  });

  useEffect(() => {
    if (isSuccess && hash) {
      const syncAndRedirect = async () => {
        const toastId = toast.loading("链上已确认，正在同步订单...");
        try {
          // --- 核心修改：调用刚写好的 sync 接口 ---
          await fetch('/api/sync'); 
          
          toast.dismiss(toastId);
          toast.success("订单同步成功！即将跳转...");
          setTimeout(() => router.push('/dashboard'), 1500);
        } catch (e) {
          toast.error("同步超时，请稍后在列表页手动刷新");
          router.push('/dashboard');
        }
      };
      syncAndRedirect();
    }
  }, [isSuccess, hash, router]);

  const handleCreate = async () => {
    if (!isConnected) return toast.error("请先连接钱包");
    if (!formData.title || !formData.sellerAddress || !formData.amount) return toast.error("请填写必填项");

    try {
      const terms = JSON.stringify({ title: formData.title, desc: formData.description });
      const durationInDays = Number(formData.duration) / 24;

      await createProject(
        terms,                  
        formData.amount,        
        formData.sellerAddress, 
        DEFAULT_TOKEN,          
        durationInDays,
        formData.deposit 
      );
      toast.info("交易已发送，请等待链上确认...");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message?.includes("User rejected") ? "用户取消签名" : "创建失败");
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-blue-600" /> 发起担保交易</CardTitle>
          <CardDescription>资金将锁定在链上，直到工作完成。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2"><Label>需求标题</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isPending} /></div>
          <div className="space-y-2"><Label>详细需求</Label><Textarea className="h-32" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={isPending} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>乙方地址</Label><Input className="font-mono" value={formData.sellerAddress} onChange={(e) => setFormData({...formData, sellerAddress: e.target.value})} disabled={isPending} /></div>
            <div className="space-y-2"><Label>金额 (USDT)</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} disabled={isPending} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-2"><Label className="flex items-center gap-1"><Clock className="w-4 h-4" /> 交付周期 (小时)</Label><Input type="number" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} disabled={isPending} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1"><Coins className="w-4 h-4" /> 乙方质押金 (USDT)</Label><Input type="number" placeholder="0" value={formData.deposit} onChange={(e) => setFormData({...formData, deposit: e.target.value})} disabled={isPending} /><p className="text-xs text-slate-500">如无质押要求请填 0</p></div>
          </div>
          <Button className="w-full bg-blue-600 py-6" onClick={handleCreate} disabled={isPending}>{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {hash ? "等待上链..." : "等待签名..."}</> : "创建并发布合约"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
