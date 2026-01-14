import { parseAbi } from 'viem';

// 1. 合约地址 (已更新为你的真实 BSC 部署地址)
export const ESCROW_CONTRACT_ADDRESS = "0xfFEA4d8EbE310F7bc1D70ee58b3D27cfd3B6D9e7";

// 2. USDT/Token ABI (用于授权 Approve)
export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]);

// 3. XEscrow 核心 ABI
export const ESCROW_ABI = [
  // --- 读方法 (Read) ---
  {
    "type": "function",
    "name": "projects",
    "inputs": [{"name": "id", "type": "uint256"}],
    "outputs": [
      {"name": "buyer", "type": "address"},
      {"name": "seller", "type": "address"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "sellerDeposit", "type": "uint256"},
      {"name": "terms", "type": "string"},
      {"name": "duration", "type": "uint256"},
      {"name": "deadline", "type": "uint256"},
      {"name": "state", "type": "uint8"},
      {"name": "extensionProposedSeconds", "type": "uint256"},
      {"name": "extensionProposer", "type": "address"},
      {"name": "confirmTime", "type": "uint256"},
      {"name": "workSubmittedTime", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "projectCount",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feePercent",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },

  // --- 写方法 (Write) ---
  {
    "type": "function",
    "name": "createProject",
    "inputs": [
      {"name": "_seller", "type": "address"},
      {"name": "_terms", "type": "string"},
      {"name": "_durationInHours", "type": "uint256"},
      {"name": "_tokenAddress", "type": "address"},
      {"name": "_amount", "type": "uint256"},
      {"name": "_sellerDepositAmount", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "confirmProject",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "depositFunds",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitWork",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "completeProject",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimAutoRelease",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "raiseDispute",
    "inputs": [{"name": "_id", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  
  // --- 事件 (Events) ---
  {
    "type": "event",
    "name": "ProjectCreated",
    "inputs": [
      {"name": "projectId", "type": "uint256", "indexed": true},
      {"name": "buyer", "type": "address", "indexed": true},
      {"name": "seller", "type": "address", "indexed": true},
      {"name": "token", "type": "address", "indexed": false},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
] as const;
