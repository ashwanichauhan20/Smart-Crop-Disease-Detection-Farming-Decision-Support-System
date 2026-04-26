import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const location = useLocation()

    // Load user on mount and route change
    useEffect(() => {
        const stored = localStorage.getItem('fasalCurrentUser')
        setCurrentUser(stored ? JSON.parse(stored) : null)
    }, [location.pathname])

    // Load notifications from localStorage
    useEffect(() => {
        const storedNotifs = JSON.parse(localStorage.getItem('fasalNotifications') || '[]')
        setNotifications(storedNotifs)
    }, [])

    // Save notifications to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('fasalNotifications', JSON.stringify(notifications))
    }, [notifications])

    // Helper to add a notification
    // targetUserEmail: specific email, or role like 'admin', 'expert', 'farmer', or 'all'
    const addNotification = (targetOptions, title, message, type = 'info') => {
        const newNotif = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ...(targetOptions || {}), // { email: '...', role: '...' }
            title,
            message,
            type, // 'info', 'success', 'warning', 'error'
            date: new Date().toLocaleString(),
            readBy: [], // array of emails that have read it
        }
        setNotifications(prev => [newNotif, ...(prev || [])])
    }

    // Helper to mark a notification as read for current user
    const markAsRead = (notifId) => {
        if (!currentUser) return
        setNotifications(prev => (prev || []).map(n => {
            if (!n) return n
            const readList = n.readBy || []
            if (n.id === notifId && !readList.includes(currentUser.email)) {
                return { ...n, readBy: [...readList, currentUser.email] }
            }
            return n
        }))
    }

    const markAllAsRead = () => {
        if (!currentUser) return
        setNotifications(prev => (prev || []).map(n => {
            if (!n) return n
            const readList = n.readBy || []
            if (!readList.includes(currentUser.email)) {
                return { ...n, readBy: [...readList, currentUser.email] }
            }
            return n
        }))
    }

    // Filter notifications for the current user
    const userNotifications = (notifications || []).filter(n => {
        if (!currentUser || !n || typeof n !== 'object') return false
        if (n.email && n.email === currentUser.email) return true
        if (n.role && n.role === currentUser.role) return true
        if (n.role === 'all') return true
        return false
    })

    const unreadCount = userNotifications.filter(n => !(n.readBy || []).includes(currentUser?.email)).length

    return (
        <NotificationContext.Provider value={{
            notifications: userNotifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            currentUser
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)
