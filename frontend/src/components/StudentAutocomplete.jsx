import { useEffect, useRef, useState } from 'react';
import { getStudents } from '../services/studentService';
import './StudentAutocomplete.css';

export default function StudentAutocomplete({ value, onChange, placeholder = 'Tìm sinh viên...', allowEmpty = true }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value ? (value.label || value.fullName || value.studentCode || '') : '');
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stored = localStorage.getItem('user');
        const parsed = stored ? JSON.parse(stored) : null;
        if (!parsed || parsed.role !== 'ADMIN') return;
        const res = await getStudents({ search: query, limit: 10 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (!cancelled) setItems(list);
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  const handleSelect = (item) => {
    setOpen(false);
    setQuery(item.fullName || item.studentCode || `SV#${item.id}`);
    onChange && onChange(item);
  };

  const handleClear = () => {
    setQuery('');
    onChange && onChange(null);
  };

  return (
    <div className="student-autocomplete" ref={ref}>
      <div className="sa-input-row">
        <input
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && <button type="button" className="sa-clear" onClick={handleClear}>×</button>}
      </div>
      {open && items && items.length > 0 && (
        <ul className="sa-list">
          {items.map((it) => (
            <li key={it.id} onClick={() => handleSelect(it)}>
              <div className="sa-item-name">{it.fullName || it.studentCode}</div>
              <div className="sa-item-meta">{it.studentCode || ''} {it.className ? `• ${it.className}` : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
