import './FeatureCard.css'

function FeatureCard({ icon, title, description, color = '#2E7D32', delay = 0 }) {
    return (
        <div
            className="feature-card"
            style={{ '--card-accent': color, animationDelay: `${delay}ms` }}
        >
            <div className="feature-card-icon">
                <span>{icon}</span>
            </div>
            <h3 className="feature-card-title">{title}</h3>
            <p className="feature-card-desc">{description}</p>
            <div className="feature-card-accent" />
        </div>
    )
}

export default FeatureCard
