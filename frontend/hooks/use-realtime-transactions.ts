import { useEffect, useState } from 'react'
import { useWebSocket, type WebSocketMessage } from './use-websocket'
import type { TransactionStatus } from '@/components/transaction/TransactionStatusPanel'

export interface RealtimeTransaction {
  id: string
  status: TransactionStatus
  txId?: string
  outboxId?: string
  message?: string
  timestamp: string
}

export interface UseRealtimeTransactionsOptions {
  transactionIds?: string[]
  onStatusChange?: (transaction: RealtimeTransaction) => void
  onError?: (error: Error) => void
}

export function useRealtimeTransactions(options: UseRealtimeTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<Map<string, RealtimeTransaction>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')

  // Get WebSocket URL from environment or use default
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
    (typeof window !== 'undefined' && window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws` 
      : `ws://${window.location.host}/ws`)

  const { 
    isConnected, 
    isConnecting, 
    error, 
    lastMessage, 
    send 
  } = useWebSocket({
    url: wsUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    enableFallback: true,
    fallbackPollInterval: 5000,
  })

  // Update connection status
  useEffect(() => {
    if (isConnecting) {
      setConnectionStatus('connecting')
    } else if (isConnected) {
      setConnectionStatus('connected')
    } else if (error) {
      setConnectionStatus('error')
    } else {
      setConnectionStatus('disconnected')
    }
  }, [isConnected, isConnecting, error])

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'transaction_status') {
      const transactionData = lastMessage.data as RealtimeTransaction
      
      setTransactions(prev => {
        const newMap = new Map(prev)
        newMap.set(transactionData.id, transactionData)
        return newMap
      })

      // Call the callback if provided
      options.onStatusChange?.(transactionData)
    }
  }, [lastMessage, options.onStatusChange])

  // Subscribe to specific transactions
  useEffect(() => {
    if (!isConnected || !options.transactionIds?.length) return

    // Subscribe to transaction updates
    send({
      type: 'subscribe',
      payload: {
        transactions: options.transactionIds
      }
    })
  }, [isConnected, options.transactionIds, send])

  // Handle errors
  useEffect(() => {
    if (error) {
      options.onError?.(error)
    }
  }, [error, options.onError])

  const getTransaction = (id: string): RealtimeTransaction | undefined => {
    return transactions.get(id)
  }

  const getAllTransactions = (): RealtimeTransaction[] => {
    return Array.from(transactions.values())
  }

  const getTransactionsByStatus = (status: TransactionStatus): RealtimeTransaction[] => {
    return Array.from(transactions.values()).filter(tx => tx.status === status)
  }

  return {
    transactions,
    connectionStatus,
    isConnected,
    isConnecting,
    error,
    getTransaction,
    getAllTransactions,
    getTransactionsByStatus,
  }
}
