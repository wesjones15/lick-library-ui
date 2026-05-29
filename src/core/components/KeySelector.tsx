import { NOTE_KEYS } from '../music';

interface Props {
  value: string;
  onChange: (key: string) => void;
}

export default function KeySelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
    >
      {NOTE_KEYS.map(note => (
        <option key={note.value} value={note.value}>{note.label}</option>
      ))}
    </select>
  );
}
