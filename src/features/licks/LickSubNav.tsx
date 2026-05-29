import { Link } from 'react-router-dom';

type ActiveTab = 'library' | 'visualizer' | 'builder' | 'legacy';

const TABS: { key: ActiveTab; label: string; to: string }[] = [
  { key: 'library',    label: 'Lick Library',   to: '/licks/library' },
  { key: 'visualizer', label: 'Lick Visualizer', to: '/lick/visualizer' },
  { key: 'builder',    label: 'Lick Builder',    to: '/licks/builder' },
  { key: 'legacy',     label: 'Legacy Upload',   to: '/licks/upload' },
];

export default function LickSubNav({ active }: { active: ActiveTab }) {
  const activeTab = TABS.find(t => t.key === active)!;
  const inactiveTabs = TABS.filter(t => t.key !== active);
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <h1 className="text-3xl font-bold text-gray-900 shrink-0">{activeTab.label}</h1>
      <div className="flex rounded-md overflow-hidden border border-gray-300">
        {inactiveTabs.map((tab, i) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors${i < inactiveTabs.length - 1 ? ' border-r border-gray-300' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
