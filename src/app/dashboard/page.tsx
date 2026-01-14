'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, MessageCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 状态映射表
const STATE_MAP: Record<number, { text: string, color: string }> = {
  0: { text: "待接单", color: "bg-slate-100 text-slate-600" },
  1: { text: "待托管", color: "bg-yellow-100 text-yellow-700" },
  2: { text: "进行中", color: "bg-blue-100 text-blue-700" },
  3: { text: "已交稿", color: "bg-green-100 text-green-700" },
  4: { text: "有争议", color: "bg-red-100 text-red-700" },
  5: { text: "已完成", color: "bg-gray-100 text-gray-500" },
  7: { text: "已取消", color: "bg-gray-100 text-gray-400" },
  8: { text: "已退款", color: "bg-gray-100 text-gray-400" },
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 数据拉取函数
  const fetchData = async (isPolling = false) => {
    if (!address) return;
    if (!isPolling) setLoading(true);

    try {
      // 1. 先触发一次后台同步 (为了让状态最新)
      // 注意：这可能会增加服务器负载，但为了体验，值得。
      await fetch('/api/sync');

      // 2. 拉取数据库数据
      const res = await fetch(\`/api/orders?address=\${address}\`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      // 初次加载
      fetchData();

      // 开启轮询 (每 5 秒刷新一次列表和状态)
      const interval = setInterval(() => fetchData(true), 5000);
      return () => clearInterval(interval);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-xl font-bold mb-4">请连接钱包以查看订单</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          我的订单 
          {/* 这里可以加个加载的小动画表示正在实时同步 */}
          <span className="relative flex h-2 w-2 ml-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </h1>
        <Link href="/create">
          <Button>发起新担保</Button>
        </Link>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
          <p className="text-slate-500 mb-4">暂无交易记录</p>
          <Link href="/create"><Button variant="outline">去创建第一笔交易</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const isBuyer = order.buyer?.walletAddress.toLowerCase() === address?.toLowerCase();
            const role = isBuyer ? '买家 (甲方)' : '卖家 (乙方)';
            const stateInfo = STATE_MAP[order.chainState] || { text: "未知", color: "bg-gray-100" };

            // 1. 新消息红点
            const lastMsg = order.messages && order.messages[0];
            const isMeMsg = lastMsg && lastMsg.sender?.walletAddress.toLowerCase() === address?.toLowerCase();
            const hasNewMsg = lastMsg && !isMeMsg && lastMsg.isRead === false;

            // 2. 状态变更红点
            // 如果最后操作人不是我，且当前状态不是“完成/取消”，就认为对方有了新进展，需要我关注
            // 这是一个简化逻辑：只要 LastActionBy != Me，且状态没结束，就显示提示
            const lastActionByMe = order.lastActionBy?.toLowerCase() === address?.toLowerCase();
            const hasStatusUpdate = !lastActionByMe && order.chainState < 5 && order.chainState > 0;

            // 如果刚创建(0)，且我是卖家，那也是个提示（提示我接单）
            const waitingForMeToAccept = order.chainState === 0 && !isBuyer;

            const showStatusDot = hasStatusUpdate || waitingForMeToAccept;

            return (
              <Link key={order.id} href={\`/order/\${order.shortId}\`}>
                <Card className="hover:shadow-md transition cursor-pointer border-l-4 border-l-blue-500 relative">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">#{order.shortId}</Badge>
                        
                        {/* 状态标签 (直接显示在列表) */}
                        <Badge className={\`\${stateInfo.color} hover:\${stateInfo.color}\`}>
                          {stateInfo.text}
                        </Badge>

                        <CardTitle className="text-lg flex items-center gap-2 ml-2">
                          {order.title}
                          
                          {/* 消息红点 */}
                          {hasNewMsg && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" /> 消息
                            </Badge>
                          )}

                          {/* 状态红点 */}
                          {showStatusDot && (
                            <Badge className="bg-orange-500 hover:bg-orange-600 h-5 px-1.5 text-[10px] flex items-center gap-1">
                              <Bell className="w-3 h-3" /> 进展
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         <Badge variant="secondary" className="text-xs font-normal">
                          {role}
                         </Badge>
                         <span className="text-sm text-slate-400">
                          {new Date(order.createdAt).toLocaleString()}
                         </span>
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
