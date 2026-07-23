import { useState, useEffect } from 'react';
import { getAttachmentUrl } from '../../api';

export default function Avatar({ name, src, size = 32, className = '' }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const resolvedSrc = src ? getAttachmentUrl(src) : '';

  if (resolvedSrc && !imgError) {
    return (
      <img
        src={resolvedSrc}
        alt={name || 'Avatar'}
        className={`avatar ${className}`}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }}
        onError={() => setImgError(true)}
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
