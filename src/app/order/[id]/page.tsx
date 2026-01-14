'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useProject } from '@/hooks/useXEscrow';
import { ChatRoom } from '@/components/chat-room';
import { ActionPanel } from '@/components/action-panel';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { address } = useAccount();
  const [orderDB, setOrderDB] = useState<any>(null);
  
  const contractId = orderDB ? BigInt(orderDB.contractId) : undefined;
  const { project: contractData, refetch } = useProject(contractId);

  useEffect(() => {
    if (id) {
      fetch(`/api/orders?id=${id}`)
        .then(res => res.json())
        .then(data => {
           // API 现在会返回数组，我们需要找到匹配的
           if (Array.isArray(data)) {
             const found = data.find((o: any) => o.shortId === id);
             setOrderDB(found);
           }
        })
        .catch(console.error);
    }
  }, [id]);

  if (!orderDB || !contractData) return <div className="p-10 text-center">正在加载...</div>;

  const isBuyer = address?.toLowerCase() === orderDB.buyer.walletAddress.toLowerCase();
  const isSeller = address?.toLowerCase() === orderDB.seller.walletAddress.toLowerCase();
  const currentUser = isBuyer ? orderDB.buyer : orderDB.seller;

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-64px)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="text-lg px-3 py-1">#{orderDB.shortId}</Badge>
              <h1 className="text-2xl font-bold">{orderDB.title}</h1>
            </div>
            <div className="flex gap-4 text-sm text-slate-500 mb-6">
               <span>金额: <b className="text-black">{orderDB.amount} USDT</b></span>
            </div>
          </div>
          <ActionPanel order={orderDB} contractData={contractData} isBuyer={isBuyer} isSeller={isSeller} refetch={refetch} />
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-bold mb-4">交易条款</h3>
            <p className="text-slate-600 whitespace-pre-wrap">{orderDB.description}</p>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">甲方:</span> <div className="font-mono text-xs">{orderDB.buyer.walletAddress}</div></div>
              <div><span className="text-slate-500">乙方:</span> <div className="font-mono text-xs">{orderDB.seller.walletAddress}</div></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 h-full"><ChatRoom orderId={id} currentUser={currentUser} /></div>
      </div>
    </div>
  );
}
