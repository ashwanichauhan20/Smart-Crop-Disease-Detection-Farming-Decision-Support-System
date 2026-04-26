import { useEffect, useState } from 'react'
import './SiteAnnouncement.css'

function SiteAnnouncement() {
    const [msg, setMsg] = useState('')
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const check = () => {
            const ann = localStorage.getItem('fasalAnnouncement') || ''
            setMsg(ann)
        }
        check()
        // Re-check every 30s in case admin publishes while user is on site
        const interval = setInterval(check, 30000)
        return () => clearInterval(interval)
    }, [])

    if (!msg || dismissed) return null

    return (
        <div className="site-announcement-bar">
            <span className="sa-pulse" />
            <p className="sa-text">📢 {msg}</p>
            <button className="sa-close" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
        </div>
    )
}

export default SiteAnnouncement
