// 1. 你的主网合约地址
export const ESCROW_CONTRACT_ADDRESS = "0xfFEA4d8EbE310F7bc1D70ee58b3D27cfd3B6D9e7";

// 2. 核心业务 ABI
export const ESCROW_ABI = [
  {
    "inputs": [{"internalType": "string","name": "_title","type": "string"},{"internalType": "uint256","name": "_amount","type": "uint256"},{"internalType": "address","name": "_seller","type": "address"},{"internalType": "uint256","name": "_sellerDeposit","type": "uint256"},{"internalType": "uint256","name": "_daysToDeliver","type": "uint256"}],
    "name": "createProject",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_projectId","type": "uint256"}],
    "name": "confirmProject",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_projectId","type": "uint256"}],
    "name": "depositFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_projectId","type": "uint256"}],
    "name": "submitWork",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_projectId","type": "uint256"}],
    "name": "completeProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "bytes32","name": "projectId","type": "bytes32"},
      {"indexed": true,"internalType": "uint256","name": "idInt","type": "uint256"},
      {"indexed": true,"internalType": "address","name": "buyer","type": "address"},
      {"indexed": true,"internalType": "address","name": "seller","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "ProjectCreated",
    "type": "event"
  }
] as const;

// 3. 补回被删掉的 ERC20 ABI (USDT授权用)
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner","type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance","type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_spender","type": "address"},{"name": "_value","type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "","type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner","type": "address"},{"name": "_spender","type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "","type": "uint256"}],
    "type": "function"
  }
] as const;
