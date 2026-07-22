export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
