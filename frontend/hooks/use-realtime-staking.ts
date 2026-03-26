import { useEffect, useState } from 'react'
import { useWebSocket, type WebSocketMessage } from './use-websocket'
import type { StakingPosition } from '@/lib/ngnStakingApi'

export interface StakingRewardUpdate {
  positionId: string
  rewards: number
  apy: number
  timestamp: string
}

export interface StakingPositionUpdate {
  positionId: string
  status: 'active' | 'completed' | 'failed'
  amount?: number
  rewards?: number
  maturityDate?: string
  timestamp: string
}

export interface UseRealtimeStakingOptions {
  positionIds?: string[]
  onRewardUpdate?: (update: StakingRewardUpdate) => void
  onPositionUpdate?: (update: StakingPositionUpdate) => void
  onError?: (error: Error) => void
}

export function useRealtimeStaking(options: UseRealtimeStakingOptions = {}) {
  const [positions, setPositions] = useState<Map<string, StakingPosition>>(new Map())
  const [rewards, setRewards] = useState<Map<string, StakingRewardUpdate>>(new Map())
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

    switch (lastMessage.type) {
      case 'staking_reward': {
        const rewardData = lastMessage.data as StakingRewardUpdate
        
        setRewards(prev => {
          const newMap = new Map(prev)
          newMap.set(rewardData.positionId, rewardData)
          return newMap
        })

        options.onRewardUpdate?.(rewardData)
        break
      }

      case 'staking_position': {
        const positionData = lastMessage.data as StakingPositionUpdate
        
        setPositions(prev => {
          const newMap = new Map(prev)
          const existingPosition = newMap.get(positionData.positionId)
          
          if (existingPosition) {
            const updatedPosition: StakingPosition = {
              ...existingPosition,
              status: positionData.status,
              rewards: positionData.rewards || existingPosition.rewards,
              maturityDate: positionData.maturityDate || existingPosition.maturityDate,
            }
            newMap.set(positionData.positionId, updatedPosition)
          }
          
          return newMap
        })

        options.onPositionUpdate?.(positionData)
        break
      }
    }
  }, [lastMessage, options.onRewardUpdate, options.onPositionUpdate])

  // Subscribe to specific positions
  useEffect(() => {
    if (!isConnected || !options.positionIds?.length) return

    // Subscribe to staking updates
    send({
      type: 'subscribe',
      payload: {
        staking: options.positionIds
      }
    })
  }, [isConnected, options.positionIds, send])

  // Handle errors
  useEffect(() => {
    if (error) {
      options.onError?.(error)
    }
  }, [error, options.onError])

  const getPosition = (positionId: string): StakingPosition | undefined => {
    return positions.get(positionId)
  }

  const getReward = (positionId: string): StakingRewardUpdate | undefined => {
    return rewards.get(positionId)
  }

  const getAllPositions = (): StakingPosition[] => {
    return Array.from(positions.values())
  }

  const getAllRewards = (): StakingRewardUpdate[] => {
    return Array.from(rewards.values())
  }

  const getTotalRewards = (): number => {
    return Array.from(rewards.values()).reduce((total, reward) => total + reward.rewards, 0)
  }

  return {
    positions,
    rewards,
    connectionStatus,
    isConnected,
    isConnecting,
    error,
    getPosition,
    getReward,
    getAllPositions,
    getAllRewards,
    getTotalRewards,
  }
}
