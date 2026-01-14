'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setLoading(true);
      // 调用我们在后端写好的 API，根据地址拉取订单
      fetch(`/api/orders?address=${address}`)
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) setOrders(data);
        })
        .finally(() => setLoading(false));
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-xl font-bold mb-4">请连接钱包以查看订单</h2>
        <p className="text-slate-500">连接后即可管理您的交易。</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">我的订单</h1>
        <Link href="/create">
          <Button>发起新担保</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
          <p className="text-slate-500 mb-4">暂无交易记录</p>
          <Link href="/create"><Button variant="outline">去创建第一笔交易</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            // 判断我是买家还是卖家
            const isBuyer = order.buyer?.walletAddress.toLowerCase() === address?.toLowerCase();
            const role = isBuyer ? '买家 (甲方)' : '卖家 (乙方)';
            
            return (
              <Link key={order.id} href={`/order/${order.shortId}`}>
                <Card className="hover:shadow-md transition cursor-pointer border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">#{order.shortId}</Badge>
                        <CardTitle className="text-lg">{order.title}</CardTitle>
                        <Badge className={isBuyer ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                          {role}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-bold">{order.amount} USDT</div>
                        <div className="text-xs text-slate-400">交易金额</div>
                      </div>
                      <ArrowRight className="text-slate-300" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
