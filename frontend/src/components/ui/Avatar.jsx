export default function Avatar({ name, src, size = 32, className = '' }) {
  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`avatar ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  );
}
