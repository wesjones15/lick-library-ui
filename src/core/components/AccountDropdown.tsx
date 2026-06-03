import { useState, useRef } from 'react';
import { useClickOutside } from '../useClickOutside';

interface AccountDropdownProps {
  currentUser: { role: string; status: string };
  onNavigateProfile: () => void;
  onLogout: () => void;
}

export default function AccountDropdown({ currentUser, onNavigateProfile, onLogout }: AccountDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xl transition-colors px-2 py-1 leading-none ${currentUser.role === 'ADMIN' ? 'text-brand-6 hover:text-brand-8' : 'text-gray-500 hover:text-gray-900'}`}
        title={`${currentUser.role} · ${currentUser.status}`}
        aria-label="Account menu"
      >
        {currentUser.role === 'ADMIN' ? '⚙︎' : '👤'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-50 min-w-[120px]">
          <button
            onClick={() => { onNavigateProfile(); setOpen(false); }}
            className="w-full text-left text-sm px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Profile
          </button>
          <button
            onClick={() => { onLogout(); setOpen(false); }}
            className="w-full text-left text-sm px-4 py-2 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
