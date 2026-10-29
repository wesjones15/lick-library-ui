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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 shrink-0">{activeTab.label}</h1>
      <div className="flex max-w-full overflow-x-auto rounded-md border-2 border-gray-400">
        {inactiveTabs.map((tab, i) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap text-gray-700 hover:bg-gray-50 transition-colors${i < inactiveTabs.length - 1 ? ' border-r-2 border-gray-400' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
