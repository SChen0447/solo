import { useState, useEffect, useRef, useCallback } from 'react';
import type { NutritionDBItem } from '../types';

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: NutritionDBItem) => void;
  placeholder?: string;
}

export default function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder
}: IngredientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NutritionDBItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current = new AbortController();
    setLoading(true);

    try {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}`, {
        signal: abortRef.current.signal
      });
      if (res.ok) {
        const data: NutritionDBItem[] = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('搜索食材失败:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  const handleSelect = (item: NutritionDBItem) => {
    onChange(item.name);
    onSelect?.(item);
    setIsOpen(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className="form-input autocomplete-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder || '输入食材名称...'}
        autoComplete="off"
      />
      {isOpen && (
        <div className="autocomplete-dropdown">
          {loading ? (
            <div className="autocomplete-loading">搜索中...</div>
          ) : (
            suggestions.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="autocomplete-option"
                onClick={() => handleSelect(item)}
              >
                <span className="option-name">{item.name}</span>
                <span className="option-nutrition">
                  {item.calories}千卡 / {item.protein}g蛋白 / {item.fat}g脂肪 / {item.carbs}g碳水
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
