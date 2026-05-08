const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
      {NOTES.map(note => (
        <option key={note} value={note}>{note}</option>
      ))}
    </select>
  );
}
