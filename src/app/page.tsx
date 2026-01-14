import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CheckCircle, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-8">
      
      {/* Hero Section */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          去中心化 <span className="text-blue-600">担保交易</span> 协议
        </h1>
        <p className="text-lg text-slate-600 md:text-xl">
          代码即法律。资金锁定在智能合约中，直到工作按约交付。
          <br className="hidden md:inline"/> 无需信任第三方，只信任区块链。
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/create">
          <Button size="lg" className="h-12 px-8 text-lg bg-blue-600 hover:bg-blue-700">
            立即发起交易 <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
            管理我的订单
          </Button>
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
        <FeatureItem 
          icon={Lock} 
          title="资金安全托管" 
          desc="资金存入 BSC 智能合约，除双方共识或仲裁外，无人能动用。" 
        />
        <FeatureItem 
          icon={CheckCircle} 
          title="自动交付验证" 
          desc="集成超时自动释放与质押金惩罚机制，杜绝恶意拖延。" 
        />
        <FeatureItem 
          icon={Shield} 
          title="公平仲裁系统" 
          desc="发生争议时，去中心化仲裁员可介入并精准分配资金。" 
        />
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition">
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
