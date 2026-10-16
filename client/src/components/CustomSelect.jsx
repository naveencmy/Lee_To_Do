// ═══════════════════════════════════════════════════════════════
// CustomSelect.jsx — Terminal-Grade Custom Dropdown Component
// Eliminates native browser dropdown rendering bugs entirely.
// Pure dark / pure white contrast, animated chevron, keyboard support.
// ═══════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './AnimatedIcons.jsx';

export default function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  style = {},
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = (currIndex + 1) % options.length;
        if (options[nextIndex]) {
          onChange({ target: { value: options[nextIndex].value } });
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = (currIndex - 1 + options.length) % options.length;
        if (options[prevIndex]) {
          onChange({ target: { value: options[prevIndex].value } });
        }
      }
    }
  };

  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <div
      ref={containerRef}
      className={`term-select ${isOpen ? 'term-select--open' : ''} ${disabled ? 'term-select--disabled' : ''} ${className}`}
      style={style}
    >
      <button
        type="button"
        id={id}
        className="term-select__trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="term-select__value">
          {selectedOption ? (
            <span className="term-select__option-content">
              {selectedOption.dot && (
                <span className="term-select__dot" style={{ backgroundColor: selectedOption.dot }} />
              )}
              {selectedOption.icon && <span className="term-select__icon">{selectedOption.icon}</span>}
              <span className="term-select__label">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="term-select__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="term-select__chevron">
          <ChevronDownIcon size={16} open={isOpen} />
        </span>
      </button>

      {isOpen && (
        <div className="term-select__menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`term-select__option ${isSelected ? 'term-select__option--selected' : ''}`}
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setIsOpen(false);
                }}
              >
                <div className="term-select__option-left">
                  {option.dot && (
                    <span className="term-select__dot" style={{ backgroundColor: option.dot }} />
                  )}
                  {option.icon && <span className="term-select__icon">{option.icon}</span>}
                  <span className="term-select__option-label">{option.label}</span>
                </div>
                {isSelected && <span className="term-select__check">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
