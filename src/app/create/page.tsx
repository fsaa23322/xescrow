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

// 默认代币地址 (BSC USDT)
const DEFAULT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"; 

export default function CreateOrderPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  
  // 1. 获取 isSuccess (上链确认状态) 和 hash
  const { createProject, isPending, isSuccess, hash } = useEscrowActions();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sellerAddress: '',
    amount: '',
    deposit: '0', 
    duration: '24', // 默认 24 小时
    token: 'USDT'
  });

  // 2. 监听上链状态：一旦链上确认，立即触发后端同步
  useEffect(() => {
    if (isSuccess && hash) {
      const syncAndRedirect = async () => {
        const toastId = toast.loading("链上已确认，正在同步订单...");
        
        try {
          // 3. 关键步骤：主动请求 API 唤醒后端并强制同步
          // 即使没有专门的 sync 接口，GET /api/orders 通常也会触发列表刷新或唤醒 DB 连接
          await fetch('/api/orders'); 
          
          toast.dismiss(toastId);
          toast.success("订单同步成功！即将跳转...");
          
          // 给一点时间让用户看到成功提示
          setTimeout(() => {
            router.push('/dashboard'); // 假设跳转到控制台
          }, 1500);

        } catch (e) {
          toast.error("同步超时，请稍后在列表页手动刷新");
          router.push('/dashboard');
        }
      };

      syncAndRedirect();
    }
  }, [isSuccess, hash, router]);

  const handleCreate = async () => {
    if (!isConnected) {
      toast.error("请先连接钱包");
      return;
    }

    if (!formData.title || !formData.sellerAddress || !formData.amount) {
      toast.error("请填写所有必填项");
      return;
    }

    try {
      const terms = JSON.stringify({ 
        title: formData.title, 
        desc: formData.description 
      });
      
      const durationInDays = Number(formData.duration) / 24;

      // 发送交易
      await createProject(
        terms,                  
        formData.amount,        
        formData.sellerAddress, 
        DEFAULT_TOKEN,          
        durationInDays          
      );

      // 注意：此处不再立即跳转，而是等待 useEffect 里的 isSuccess
      toast.info("交易已发送，正在等待链上确认 (请勿关闭页面)...");

    } catch (error: any) {
      console.error(error);
      const msg = error.message || "创建失败";
      if (msg.includes("User rejected")) {
        toast.warning("用户取消了签名");
      } else {
        toast.error("创建失败: " + msg.slice(0, 50));
      }
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            发起担保交易
          </CardTitle>
          <CardDescription>
            创建一个基于智能合约的安全订单。资金将锁定在链上，直到工作完成。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 表单区域 */}
          <div className="space-y-2">
            <Label>需求标题</Label>
            <Input 
              placeholder="例如：开发一个 React 官网" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>详细需求 / 条款</Label>
            <Textarea 
              placeholder="请详细描述交付标准，这将作为仲裁依据..." 
              className="h-32"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>乙方钱包地址 (接单方)</Label>
              <Input 
                placeholder="0x..." 
                className="font-mono"
                value={formData.sellerAddress}
                onChange={(e) => setFormData({...formData, sellerAddress: e.target.value})}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>交易金额 (USDT)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  disabled={isPending}
                />
                <div className="absolute right-3 top-2.5 text-sm text-gray-500 font-bold">
                  USDT
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> 交付周期 (小时)
              </Label>
              <Input 
                type="number" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Coins className="w-4 h-4" /> 乙方质押金 (暂不支持)
              </Label>
              <Input 
                type="number" 
                disabled
                placeholder="0"
                value="0"
              />
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            onClick={handleCreate}
            disabled={isPending} // 交易过程中禁用按钮
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {hash ? "等待链上确认..." : "正在请求签名..."}
              </>
            ) : (
              "创建并发布合约"
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
