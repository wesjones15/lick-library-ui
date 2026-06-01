import { NOTE_KEYS } from '../music';
import { SELECT } from '../ui';

interface Props {
  value: string;
  onChange: (key: string) => void;
}

export default function KeySelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={SELECT}
    >
      {NOTE_KEYS.map(note => (
        <option key={note.value} value={note.value}>{note.label}</option>
      ))}
    </select>
  );
}
