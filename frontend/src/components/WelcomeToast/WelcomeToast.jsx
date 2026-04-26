import { useEffect, useState } from 'react'
import './WelcomeToast.css'

function WelcomeToast() {
    const [visible, setVisible] = useState(false)
    const [user, setUser] = useState(null)
    const [isNew, setIsNew] = useState(false)

    useEffect(() => {
        const shouldShow = sessionStorage.getItem('showWelcomeToast')
        const newReg = sessionStorage.getItem('isNewRegistration') === 'true'

        if (shouldShow === 'true') {
            const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
            setUser(currentUser)
            setIsNew(newReg)
            setVisible(true)

            sessionStorage.removeItem('showWelcomeToast')
            sessionStorage.removeItem('isNewRegistration')

            const timer = setTimeout(() => setVisible(false), isNew ? 7000 : 4500)
            return () => clearTimeout(timer)
        }
    }, [isNew])

    if (!visible || !user) return null

    const roleLabel = user.role === 'farmer' ? '🌾 Farmer' : user.role === 'expert' ? '👨‍⚕️ Expert' : '🛡️ Admin'

    const getSafeName = (u) => {
        if (!u) return 'User'
        const nameField = u.name || u.email
        return typeof nameField === 'string' ? nameField : 'User'
    }

    return (
        <div className={`welcome-toast ${visible ? 'wt-in' : 'wt-out'}`}>
            <div className="wt-icon">{isNew ? '🎊' : '🎉'}</div>
            <div className="wt-body">
                <p className="wt-title">
                    {isNew ? 'Welcome to Smart-Fasal, ' : 'Welcome back, '}
                    <strong>{getSafeName(user)}!</strong>
                </p>
                <p className="wt-sub">
                    {isNew ? 'Thank you for creating an account.' : `${roleLabel} · Smart-Fasal Suraksha`}
                </p>
            </div>
            <button className="wt-close" onClick={() => setVisible(false)}>✕</button>
            <div className="wt-progress" />
        </div>
    )
}

export default WelcomeToast
