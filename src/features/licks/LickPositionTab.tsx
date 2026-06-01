import { C_GRAY_BG_900, C_SUCCESS_TEXT_SOFT } from '../../core/colors';
interface Props {
  tabString: string;
}

export default function LickPositionTab({ tabString }: Props) {
  return (
    <pre className={`${C_GRAY_BG_900} ${C_SUCCESS_TEXT_SOFT} font-mono text-sm p-4 rounded-lg overflow-x-auto whitespace-pre`}>
      {tabString}
    </pre>
  );
}
