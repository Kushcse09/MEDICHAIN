'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletService } from './wallet';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated on mount
    const checkConnection = async () => {
      try {
        if (walletService.isAuthenticated()) {
          const storedAddress = walletService.getStoredAddress();
          if (storedAddress) {
            setAddress(storedAddress);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await walletService.authenticateWithBackend();
      const connectedAddress = walletService.getStoredAddress();
      
      if (connectedAddress) {
        setAddress(connectedAddress);
        setIsConnected(true);
        
        // Switch to Ethereum Sepolia testnet
        try {
          await walletService.switchToPolygonAmoy();
        } catch (networkError) {
          console.warn('Could not switch to Sepolia:', networkError);
        }
      }
    } catch (err: any) {
      // Check if user rejected the signature
      if (err.message?.includes('rejected') || err.message?.includes('denied') || err.code === 'ACTION_REJECTED') {
        setError('You need to sign the message to authenticate. Please try again and approve the signature request.');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    walletService.disconnect();
    setAddress(null);
    setIsConnected(false);
    setError(null);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isLoading,
        connect,
        disconnect,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
