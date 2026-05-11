const NOTES = [
  { value: 'C',       label: 'C'  },
  { value: 'C_SHARP', label: 'C#' },
  { value: 'D',       label: 'D'  },
  { value: 'D_SHARP', label: 'D#' },
  { value: 'E',       label: 'E'  },
  { value: 'F',       label: 'F'  },
  { value: 'F_SHARP', label: 'F#' },
  { value: 'G',       label: 'G'  },
  { value: 'G_SHARP', label: 'G#' },
  { value: 'A',       label: 'A'  },
  { value: 'A_SHARP', label: 'Bb' },
  { value: 'B',       label: 'B'  },
];

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
        <option key={note.value} value={note.value}>{note.label}</option>
      ))}
    </select>
  );
}
