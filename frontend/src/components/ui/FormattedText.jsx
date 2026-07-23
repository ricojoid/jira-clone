import React from 'react';

export default function FormattedText({ text, style }) {
  if (!text) return null;

  // Regex to match HTTP/HTTPS URLs, www URLs, and @mentions
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+|@\[[^\]]+\]|@[a-zA-Z0-9_\.\-]+)/gi;
  const parts = text.split(regex);

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Check if part is a URL
        if (/^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(part)) {
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: '#3b82f6',
                fontWeight: 600,
                textDecoration: 'underline',
                wordBreak: 'break-all',
              }}
            >
              {part}
            </a>
          );
        }

        // Check if part is an @mention
        if (/^(@\[[^\]]+\]|@[a-zA-Z0-9_\.\-]+)$/i.test(part)) {
          return (
            <span
              key={index}
              style={{
                color: 'var(--primary)',
                backgroundColor: 'rgba(99, 102, 241, 0.14)',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                display: 'inline-block',
                margin: '0 2px',
              }}
            >
              {part}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
