import { ethers } from 'ethers';
import { CONTRACT_CONFIG, isCorrectNetwork, getTxUrl } from './contractConfig.js';

// Global variables
let provider = null;
let signer = null;
let tokenContract = null;
let usdcContract = null;

/**
 * Initialize Web3 connection
 */
export async function initializeWeb3() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or another Web3 wallet!");
  }

  // Request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  
  // Create provider and signer
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  
  // Check network
  const network = await provider.getNetwork();
  if (!isCorrectNetwork(Number(network.chainId))) {
    await switchToBaseNetwork();
  }
  
  // Initialize contracts
  tokenContract = new ethers.Contract(
    CONTRACT_CONFIG.address,
    CONTRACT_CONFIG.abi,
    signer
  );
  
  usdcContract = new ethers.Contract(
    CONTRACT_CONFIG.usdc.address,
    CONTRACT_CONFIG.usdc.abi,
    signer
  );
  
  return { provider, signer, tokenContract, usdcContract };
}

/**
 * Switch to Base Mainnet
 */
export async function switchToBaseNetwork() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + CONTRACT_CONFIG.network.chainId.toString(16) }],
    });
  } catch (switchError) {
    // Network not added, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x' + CONTRACT_CONFIG.network.chainId.toString(16),
            chainName: CONTRACT_CONFIG.network.name,
            nativeCurrency: CONTRACT_CONFIG.network.nativeCurrency,
            rpcUrls: [CONTRACT_CONFIG.network.rpcUrl],
            blockExplorerUrls: [CONTRACT_CONFIG.network.blockExplorer]
          }]
        });
      } catch (addError) {
        throw new Error("Failed to add Base network to wallet");
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Get user's connected wallet address
 */
export async function getWalletAddress() {
  if (!signer) await initializeWeb3();
  return await signer.getAddress();
}

/**
 * Check USDC balance
 */
export async function getUSDCBalance(address) {
  if (!usdcContract) await initializeWeb3();
  const balance = await usdcContract.balanceOf(address);
  return ethers.formatUnits(balance, CONTRACT_CONFIG.usdc.decimals);
}

/**
 * Check USDC allowance
 */
export async function getUSDCAllowance(address) {
  if (!usdcContract) await initializeWeb3();
  const allowance = await usdcContract.allowance(address, CONTRACT_CONFIG.address);
  return ethers.formatUnits(allowance, CONTRACT_CONFIG.usdc.decimals);
}

/**
 * Approve USDC spending
 */
export async function approveUSDC(amount) {
  if (!usdcContract) await initializeWeb3();
  
  const amountInWei = ethers.parseUnits(amount.toString(), CONTRACT_CONFIG.usdc.decimals);
  const tx = await usdcContract.approve(CONTRACT_CONFIG.address, amountInWei);
  
  console.log("Approval transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Approval confirmed!");
  
  return {
    hash: tx.hash,
    receipt,
    url: getTxUrl(tx.hash)
  };
}

/**
 * Mint tokens
 */
export async function mintTokens(toAddress) {
  if (!tokenContract) await initializeWeb3();
  
  // Check if minting is paused
  const isPaused = await tokenContract.mintingPaused();
  if (isPaused) {
    throw new Error("Minting is currently paused");
  }
  
  // Check USDC balance
  const userAddress = await getWalletAddress();
  const usdcBalance = await getUSDCBalance(userAddress);
  if (parseFloat(usdcBalance) < 1) {
    throw new Error("Insufficient USDC balance. You need at least 1 USDC.");
  }
  
  // Check allowance
  const allowance = await getUSDCAllowance(userAddress);
  if (parseFloat(allowance) < 1) {
    console.log("Approving USDC...");
    await approveUSDC(1);
  }
  
  // Mint tokens
  console.log("Minting tokens...");
  const tx = await tokenContract.mint(toAddress);
  console.log("Mint transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Mint confirmed!");
  
  // Parse event to get mint details
  const event = receipt.logs.find(log => {
    try {
      return tokenContract.interface.parseLog(log)?.name === 'TokensMinted';
    } catch {
      return false;
    }
  });
  
  let mintDetails = null;
  if (event) {
    const parsed = tokenContract.interface.parseLog(event);
    mintDetails = {
      user: parsed.args.user,
      amount: ethers.formatEther(parsed.args.amount),
      mintNumber: parsed.args.mintNumber.toString(),
      usdcPaid: ethers.formatUnits(parsed.args.usdcPaid, 6)
    };
  }
  
  return {
    hash: tx.hash,
    receipt,
    url: getTxUrl(tx.hash),
    mintDetails
  };
}

/**
 * Batch mint tokens
 */
export async function batchMintTokens(toAddress, batchCount) {
  if (!tokenContract) await initializeWeb3();
  
  if (batchCount < 1 || batchCount > 10) {
    throw new Error("Batch count must be between 1 and 10");
  }
  
  // Check if minting is paused
  const isPaused = await tokenContract.mintingPaused();
  if (isPaused) {
    throw new Error("Minting is currently paused");
  }
  
  const totalCost = batchCount;
  
  // Check USDC balance
  const userAddress = await getWalletAddress();
  const usdcBalance = await getUSDCBalance(userAddress);
  if (parseFloat(usdcBalance) < totalCost) {
    throw new Error(`Insufficient USDC balance. You need ${totalCost} USDC.`);
  }
  
  // Check allowance
  const allowance = await getUSDCAllowance(userAddress);
  if (parseFloat(allowance) < totalCost) {
    console.log("Approving USDC...");
    await approveUSDC(totalCost);
  }
  
  // Batch mint
  console.log(`Batch minting ${batchCount} times...`);
  const tx = await tokenContract.batchMint(toAddress, batchCount);
  console.log("Batch mint transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Batch mint confirmed!");
  
  return {
    hash: tx.hash,
    receipt,
    url: getTxUrl(tx.hash)
  };
}

/**
 * Get user's token balance
 */
export async function getTokenBalance(address) {
  if (!tokenContract) await initializeWeb3();
  const balance = await tokenContract.balanceOf(address);
  return ethers.formatEther(balance);
}

/**
 * Get user's mint statistics
 */
export async function getUserMintStats(address) {
  if (!tokenContract) await initializeWeb3();
  const [mintCount, tokenBalance, lastMintTime] = await tokenContract.getMintStats(address);
  
  return {
    mintCount: mintCount.toString(),
    tokenBalance: ethers.formatEther(tokenBalance),
    lastMintTime: Number(lastMintTime) > 0 ? new Date(Number(lastMintTime) * 1000) : null
  };
}

/**
 * Get global minting statistics
 */
export async function getGlobalStats() {
  if (!tokenContract) await initializeWeb3();
  const [totalMints, remainingMints, totalSupply, totalRevenue] = await tokenContract.getGlobalStats();
  
  return {
    totalMints: totalMints.toString(),
    remainingMints: remainingMints.toString(),
    totalSupply: ethers.formatEther(totalSupply),
    totalRevenue: ethers.formatUnits(totalRevenue, 6)
  };
}

/**
 * Add token to wallet (MetaMask)
 */
export async function addTokenToWallet() {
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: CONTRACT_CONFIG.address,
          symbol: CONTRACT_CONFIG.token.symbol,
          decimals: CONTRACT_CONFIG.token.decimals,
          image: '', // Add your token logo URL here
        },
      },
    });
    
    if (wasAdded) {
      console.log('Token added to wallet!');
    }
    return wasAdded;
  } catch (error) {
    console.error('Error adding token to wallet:', error);
    throw error;
  }
}

/**
 * Listen for mint events
 */
export function onMintEvent(callback) {
  if (!tokenContract) throw new Error("Contract not initialized");
  
  tokenContract.on("TokensMinted", (user, amount, mintNumber, usdcPaid, event) => {
    callback({
      user,
      amount: ethers.formatEther(amount),
      mintNumber: mintNumber.toString(),
      usdcPaid: ethers.formatUnits(usdcPaid, 6),
      transactionHash: event.log.transactionHash
    });
  });
}

/**
 * Stop listening for mint events
 */
export function removeAllListeners() {
  if (tokenContract) {
    tokenContract.removeAllListeners();
  }
}

// Export all functions
export default {
  initializeWeb3,
  switchToBaseNetwork,
  getWalletAddress,
  getUSDCBalance,
  getUSDCAllowance,
  approveUSDC,
  mintTokens,
  batchMintTokens,
  getTokenBalance,
  getUserMintStats,
  getGlobalStats,
  addTokenToWallet,
  onMintEvent,
  removeAllListeners
};
