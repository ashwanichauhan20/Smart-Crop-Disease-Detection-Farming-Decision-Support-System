import './Button.css'

function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    onClick,
    type = 'button',
    fullWidth = false,
    disabled = false,
}) {
    return (
        <button
            type={type}
            className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${disabled ? 'btn-disabled' : ''}`}
            onClick={onClick}
            disabled={disabled}
        >
            {icon && <span className="btn-icon">{icon}</span>}
            <span>{children}</span>
        </button>
    )
}

export default Button
