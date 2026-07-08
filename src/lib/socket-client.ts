'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function initSocket(userId?: string) {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('[socket] connected')
      if (userId) {
        socket?.emit('auth', { userId })
      }
    })

    socket.on('disconnect', () => {
      console.log('[socket] disconnected')
    })
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
