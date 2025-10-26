// Contract configuration for x402rocks token
export const CONTRACT_CONFIG = {
  // ⚠️ UPDATE THIS AFTER DEPLOYMENT!
  address: "0x90AcD7128e5cdb7A4211Db0BE059400e35B329C3", // Replace with your deployed contract address
  
  // Contract ABI - minimal interface for frontend
  abi: [
    // Read Functions
    "function balanceOf(address account) view returns (uint256)",
    "function totalMints() view returns (uint256)",
    "function userMints(address) view returns (uint256)",
    "function mintTimestamps(address) view returns (uint256)",
    "function getMintStats(address user) view returns (uint256 mintCount, uint256 tokenBalance, uint256 lastMintTime)",
    "function getGlobalStats() view returns (uint256 currentTotalMints, uint256 remainingMints, uint256 currentTotalSupply, uint256 totalRevenue)",
    "function TOKENS_PER_MINT() view returns (uint256)",
    "function MINT_PRICE() view returns (uint256)",
    "function MAX_MINTS() view returns (uint256)",
    "function MAX_SUPPLY() view returns (uint256)",
    "function mintingPaused() view returns (bool)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    
    // Write Functions
    "function mint(address to) external",
    "function batchMint(address to, uint256 batchCount) external",
    
    // Events
    "event TokensMinted(address indexed user, uint256 amount, uint256 mintNumber, uint256 usdcPaid)",
    "event BatchMinted(address indexed user, uint256 batchCount, uint256 totalTokens, uint256 totalUSDC)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ],
  
  // Network configuration
  network: {
    chainId: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    }
  },
  
  // USDC configuration on Base Mainnet
  usdc: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    symbol: "USDC",
    abi: [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ]
  },
  
  // Token configuration
  token: {
    name: "x402rocks",
    symbol: "x402rocks",
    decimals: 18,
    maxSupply: "2000000000", // 2 billion
    tokensPerMint: "50000",
    mintPriceUSDC: "1",
    maxMints: 40000
  }
};

// Helper function to check if on correct network
export function isCorrectNetwork(chainId) {
  return chainId === CONTRACT_CONFIG.network.chainId;
}

// Helper function to get contract URL on Basescan
export function getContractUrl() {
  return `${CONTRACT_CONFIG.network.blockExplorer}/address/${CONTRACT_CONFIG.address}`;
}

// Helper function to get transaction URL
export function getTxUrl(txHash) {
  return `${CONTRACT_CONFIG.network.blockExplorer}/tx/${txHash}`;
}

// Export for easy import
export default CONTRACT_CONFIG;
