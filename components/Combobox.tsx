import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface ComboboxItem {
  id: string;
  name: string;
}

interface ComboboxProps {
  label: string;
  placeholder?: string;
  value: string;
  inputValue: string;
  items: ComboboxItem[];
  selectedId: string | null;
  onSelect: (item: ComboboxItem | null) => void;
  onInputChange: (value: string) => void;
  onCreate?: (name: string) => Promise<void>;
  emptyLabel?: string;
  disabled?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({
  label,
  placeholder = 'Выберите или введите...',
  inputValue,
  items,
  selectedId,
  onSelect,
  onInputChange,
  onCreate,
  emptyLabel = 'Не указан',
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = items.filter(c =>
    c.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const canCreate = onCreate &&
    inputValue.trim() &&
    !items.some(c => c.name.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pr-8"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            onInputChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => setShowDropdown(!showDropdown)}
          tabIndex={-1}
        >
          <ChevronDown size={18} />
        </button>
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500"
              onClick={() => {
                onSelect(null);
                setShowDropdown(false);
              }}
            >
              {emptyLabel}
            </button>
            {filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${selectedId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => {
                  onSelect(item);
                  setShowDropdown(false);
                }}
              >
                {item.name}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-green-50 text-green-700 border-t border-slate-100 flex items-center gap-2"
                onClick={async () => {
                  await onCreate(inputValue.trim());
                  setShowDropdown(false);
                }}
              >
                <Plus size={16} />
                Создать «{inputValue.trim()}»
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Combobox;
