import React, { useRef } from 'react';

/**
 * Custom Date Filter Input Component
 * Covers native date input placeholder with custom clean placeholder like '--/--/----'
 * Opens native date picker instantly on clicking anywhere inside the input box or container.
 */
export function DateFilterInput({ value, onChange, placeholder = '--/--/----', style }) {
  const inputRef = useRef(null);

  const handleClick = (e) => {
    try {
      if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      }
    } catch {
      // Fallback for browsers that don't support showPicker
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
    >
      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        onChange={onChange}
        onClick={handleClick}
        className={`form-input date-input-field ${!value ? 'date-input-empty' : ''}`}
        style={{
          width: '135px',
          height: 34,
          padding: '0 8px 0 10px',
          fontSize: '0.8rem',
          color: value ? 'var(--text-main)' : 'transparent',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          ...style,
        }}
      />
      {!value && (
        <span
          style={{
            position: 'absolute',
            left: 10,
            pointerEvents: 'none',
            fontSize: '0.8rem',
            color: 'var(--text-light)',
            fontWeight: 500,
            letterSpacing: '1px',
          }}
        >
          {placeholder}
        </span>
      )}
    </div>
  );
}

export default DateFilterInput;
