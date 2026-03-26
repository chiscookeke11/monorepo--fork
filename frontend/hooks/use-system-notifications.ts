import { useEffect, useState } from 'react'
import { useWebSocket, type WebSocketMessage } from './use-websocket'
import { toast } from '@/hooks/use-toast'

export interface SystemNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  persistent?: boolean
  actions?: Array<{
    label: string
    action: string
  }>
}

export interface UseSystemNotificationsOptions {
  showToast?: boolean
  onError?: (error: Error) => void
}

export function useSystemNotifications(options: UseSystemNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Get WebSocket URL from environment or use default
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
    (typeof window !== 'undefined' && window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws` 
      : `ws://${window.location.host}/ws`)

  const { 
    isConnected, 
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

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'system_notification') {
      const notification = lastMessage.data as SystemNotification
      
      setNotifications(prev => [notification, ...prev])
      
      // Update unread count
      if (!notification.persistent) {
        setUnreadCount(prev => prev + 1)
      }

      // Show toast notification if enabled
      if (options.showToast !== false) {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === 'error' ? 'destructive' : 'default',
        })
      }
    }
  }, [lastMessage, options.showToast])

  // Subscribe to system notifications
  useEffect(() => {
    if (!isConnected) return

    // Subscribe to system notifications
    send({
      type: 'subscribe',
      payload: {
        notifications: true
      }
    })
  }, [isConnected, send])

  // Handle errors
  useEffect(() => {
    if (error) {
      options.onError?.(error)
    }
  }, [error, options.onError])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
    
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    )
    
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const getUnreadNotifications = (): SystemNotification[] => {
    return notifications.filter(notification => !notification.read)
  }

  const getNotificationsByType = (type: SystemNotification['type']): SystemNotification[] => {
    return notifications.filter(notification => notification.type === type)
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    getUnreadNotifications,
    getNotificationsByType,
  }
}
