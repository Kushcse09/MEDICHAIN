import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { authAPI } from './api';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class WalletService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;

  async isWalletAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  async connectWallet(): Promise<string> {
    if (!await this.isWalletAvailable()) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.signer = await this.provider.getSigner();
      return accounts[0];
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }

  async getConnectedAddress(): Promise<string | null> {
    if (!this.provider) {
      return null;
    }

    try {
      this.signer = await this.provider.getSigner();
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.signer.signMessage(message);
    } catch (error: any) {
      console.error('Error signing message:', error);
      throw new Error(error.message || 'Failed to sign message');
    }
  }

  async authenticateWithBackend(): Promise<string> {
    try {
      // Connect wallet
      const address = await this.connectWallet();
      
      // Get nonce from backend
      const nonce = await authAPI.getNonce(address);
      
      // Sign the nonce
      const message = `MediChain Login Request\n\nNonce: ${nonce}\n\nSigning this message proves you own this wallet address and allows you to access your medical records.`;
      const signature = await this.signMessage(message);
      
      // Send signature to backend for verification
      const token = await authAPI.login(address, signature);
      
      // Store token
      localStorage.setItem('medichain_token', token);
      localStorage.setItem('medichain_address', address);
      
      return token;
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async switchToSepolia() {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    // Ethereum Sepolia testnet — chosen for reliability over Polygon Amoy's unstable public RPC
    const chainId = '0xaa36a7'; // Sepolia chain ID: 11155111
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      // If chain not added, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId,
            chainName: 'Ethereum Sepolia Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [
              process.env.NEXT_PUBLIC_SEPOLIA_RPC ||
              'https://eth-sepolia.g.alchemy.com/v2/demo',
            ],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  // Backwards compat alias — callers using the old name still work
  async switchToPolygonAmoy() {
    return this.switchToSepolia();
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    localStorage.removeItem('medichain_token');
    localStorage.removeItem('medichain_address');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('medichain_token');
  }

  getStoredAddress(): string | null {
    return localStorage.getItem('medichain_address');
  }
}

export const walletService = new WalletService();
