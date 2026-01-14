import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';

// 1. 获取项目 ID (从环境变量)
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'YOUR_PROJECT_ID';

// 2. 配置 Web3 链与连接器
export const config = getDefaultConfig({
  appName: 'XEscrow Decentralized Platform',
  projectId,
  // 同时支持 BSC 主网和测试网，方便你切换调试
  chains: [bsc, bscTestnet],
  ssr: true, // 开启服务端渲染支持 (Next.js 必须)
});
