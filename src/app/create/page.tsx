'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Clock, Coins } from 'lucide-react';
import { useEscrowActions } from '@/hooks/useXEscrow';

// 默认代币地址 (BSC USDT - 这里暂时用你合约里支持的，测试时可用 Mock)
// 如果是测试网，请换成测试网的 USDT 地址
const DEFAULT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"; 

export default function CreateOrderPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createProject, isPending } = useEscrowActions();

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sellerAddress: '',
    amount: '',
    deposit: '0', // 默认 0 质押
    duration: '24', // 默认 24 小时
    token: 'USDT'
  });

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
      // 1. 调用 Hook 写入链上
      // 参数: 卖家, 条款(JSON), 工期(小时), 代币地址, 金额, 质押金
      const terms = JSON.stringify({ 
        title: formData.title, 
        desc: formData.description 
      });
      
      const tx = await createProject(
        formData.sellerAddress,
        terms,
        Number(formData.duration),
        DEFAULT_TOKEN, 
        formData.amount,
        formData.deposit
      );

      console.log("Tx Hash:", tx);
      toast.success("订单创建成功！等待链上确认...");
      
      // 2. 跳转到列表页 (稍后开发)
      // router.push('/dashboard'); 
      // 暂时重置表单
      setFormData({ ...formData, title: '', amount: '' });

    } catch (error: any) {
      console.error(error);
      // 提取错误信息
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
          
          {/* 1. 项目基本信息 */}
          <div className="space-y-2">
            <Label>需求标题</Label>
            <Input 
              placeholder="例如：开发一个 React 官网" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>详细需求 / 条款</Label>
            <Textarea 
              placeholder="请详细描述交付标准，这将作为仲裁依据..." 
              className="h-32"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* 2. 交易对象与金额 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>乙方钱包地址 (接单方)</Label>
              <Input 
                placeholder="0x..." 
                className="font-mono"
                value={formData.sellerAddress}
                onChange={(e) => setFormData({...formData, sellerAddress: e.target.value})}
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
                />
                <div className="absolute right-3 top-2.5 text-sm text-gray-500 font-bold">
                  USDT
                </div>
              </div>
            </div>
          </div>

          {/* 3. 风控设置 (防卡死逻辑的核心) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> 交付周期 (小时)
              </Label>
              <Input 
                type="number" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
              <p className="text-xs text-slate-500">
                超过 {formData.duration} 小时未交付将显示“已超时”，但允许继续进行。
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Coins className="w-4 h-4" /> 乙方质押金 (选填)
              </Label>
              <Input 
                type="number" 
                placeholder="0"
                value={formData.deposit}
                onChange={(e) => setFormData({...formData, deposit: e.target.value})}
              />
              <p className="text-xs text-slate-500">
                接单方需先缴纳此金额才能接单。
              </p>
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            onClick={handleCreate}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在上链...
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
