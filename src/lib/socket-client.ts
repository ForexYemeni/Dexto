'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function initSocket(userId?: string) {
  // On Vercel production, Socket.io mini-service is not available
  // The platform works fine without it (uses polling for data refresh instead)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('preview')) {
    console.log('[socket] Skipping socket connection in production (Vercel)')
    return null
  }

  if (!socket) {
    try {
      socket = io('/?XTransformPort=3003', {
        path: '/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000,
      })

      socket.on('connect', () => {
        console.log('[socket] connected')
        if (userId) {
          socket?.emit('auth', { userId })
        }
      })

      socket.on('connect_error', () => {
        console.log('[socket] connection failed - continuing without realtime')
        socket = null
      })

      socket.on('disconnect', () => {
        console.log('[socket] disconnected')
      })
    } catch (e) {
      console.log('[socket] init failed, continuing without realtime')
      socket = null
    }
  } else if (userId && socket.connected) {
    socket.emit('auth', { userId })
  }
  return socket
}

export function useSocket(userId?: string) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initSocket(userId)
  }, [userId])

  return socket
}
