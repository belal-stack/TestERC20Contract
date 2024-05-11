import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";

// Define the type for contract deployment metadata
interface TokenContractDeployMetadata {
  name: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  primary_sale_recipient: string;
}

const RPC_ENDPOINT_URL = "https://sepolia.drpc.org/";
const MINIMUM_GAS_LIMIT = 100000; // Set the minimum gas limit here

const NETWORK = "sepolia"; // Use the desired testnet
const userAddress = "0x41463D5D1dC3E2E59a11023d95c76c745F978d07"; // Replace with your actual public address
const PRIVATE_KEY = "354ffe37b12ece1e9b176531bfaf2fb3eb9e1b6cb5da731c97bfb98545d09101"; // Your wallet's private key

// Define contract deployment metadata
const metadata: TokenContractDeployMetadata = {
  name: "ERC20Token",
  symbol: "MTK",
  totalSupply: 1000000,
  decimals: 18,
  primary_sale_recipient: userAddress
};

// Function to deploy ERC20 token contract
async function deployTokenContract(metadata: TokenContractDeployMetadata): Promise<string> {
  const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY, NETWORK, { clientId: '9d34683b985d97d612dc0b0b1e641419', secretKey: 'Hoq0Qy7I9jnGwijrHb3dYQo2EpmevXnKLoF8utWRu7mYbrwb7m3SzM1Yq7VyTGMy1R53VO4epeBj3RnlXrQaZw' });

  // Deploy the ERC20 token contract
  const deployedAddress = await sdk.deployer.deployToken(metadata);

  console.log("Token deployed at:", deployedAddress);

  return deployedAddress;
}

// Function to transfer ownership of the ERC20 token contract
async function transferOwnership(contractAddress: string, newOwnerAddress: string, currentOwnerPrivateKey: string): Promise<void> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT_URL); // Replace RPC_ENDPOINT_URL with your JSON-RPC endpoint URL
  const wallet = new ethers.Wallet(currentOwnerPrivateKey, provider);

  const abi = ["function transferOwnership(address newOwner) public"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const transaction = await contract.transferOwnership(newOwnerAddress, { gasLimit: MINIMUM_GAS_LIMIT });

  console.log("Ownership transfer transaction hash:", transaction.hash);

  await transaction.wait();
  console.log("Ownership transferred to:", newOwnerAddress);
}

// Function to add liquidity to Uniswap
async function addLiquidityToUniswap(tokenAddress: string, tokenAmount: string, ethAmount: string, privateKey: string): Promise<void> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Load Uniswap router contract
  const uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router address
  const uniswapRouterABI = ["function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)"];
  const uniswapRouterContract = new ethers.Contract(uniswapRouterAddress, uniswapRouterABI, wallet);

  // Approve token for trading
  const tokenContract = new ethers.Contract(tokenAddress, ["function approve(address spender, uint amount)"], wallet);
  const approvalTx = await tokenContract.approve(uniswapRouterAddress, tokenAmount);

  await approvalTx.wait();

  // Add liquidity to Uniswap
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  const tx = await uniswapRouterContract.addLiquidityETH(tokenAddress, tokenAmount, '0', '0', userAddress, deadline, { value: ethAmount, gasLimit: MINIMUM_GAS_LIMIT });

  console.log("Liquidity added to Uniswap:", tx.hash);
}

// Main function
async function main() {
  // Fetch user's ETH balance before deployment
  const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY, "sepolia", { clientId: '9d34683b985d97d612dc0b0b1e641419', secretKey: 'Hoq0Qy7I9jnGwijrHb3dYQo2EpmevXnKLoF8utWRu7mYbrwb7m3SzM1Yq7VyTGMy1R53VO4epeBj3RnlXrQaZw' });
  const balanceBefore = await sdk.getBalance(userAddress);

  console.log('User ETH balance before deployment:', balanceBefore, 'ETH');

  // Deploy ERC20 token contract
  const contractAddress = await deployTokenContract(metadata);

  // Transfer ownership of the contract to a new address
  const newOwnerAddress = "0xA885Ad91Ab567076f2e57A09b8d109e9D6B123d2"; // Replace with the new owner's address
  await transferOwnership(contractAddress, newOwnerAddress, PRIVATE_KEY);

  // Add liquidity to Uniswap
  const tokenAmount = "100000"; // Amount of tokens to provide liquidity
  const ethAmount = ethers.utils.parseEther("1"); // Amount of ETH to provide liquidity
  await addLiquidityToUniswap(contractAddress, tokenAmount, ethAmount.toString(), PRIVATE_KEY);

  // Mint tokens to another specific address
  const toAddress = "0xA885Ad91Ab567076f2e57A09b8d109e9D6B123d2"; // Replace with a valid wallet address
  const amount = "100"; // The amount of tokens to mint
  const mintTransaction = await (await sdk.getToken(contractAddress)).mintTo(toAddress, amount);
  console.log("Mint transaction:", mintTransaction);

  // Fetch user's ETH balance after deployment
  const balanceAfter = await sdk.getBalance(userAddress);
  console.log('User ETH balance after deployment:', balanceAfter, 'ETH');

  // Output link to transaction scanner
  console.log('Transaction scanner link: https://sepolia.etherscan.io/tx/' + contractAddress);
}

// Execute main function
main().catch(err => console.error(err));
