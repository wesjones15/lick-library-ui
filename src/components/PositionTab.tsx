interface Props {
  tabString: string;
}

export default function PositionTab({ tabString }: Props) {
  return (
    <pre className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg overflow-x-auto whitespace-pre">
      {tabString}
    </pre>
  );
}
