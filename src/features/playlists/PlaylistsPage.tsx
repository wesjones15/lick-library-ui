export default function PlaylistsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Playlists</h1>
      <p className="text-gray-400 text-sm leading-relaxed">
        Create and manage song playlists with per-song key and capo overrides.
        Navigate sequentially through a set with ← Back / Next → controls and
        a "back to playlist" breadcrumb on each song page.
      </p>
    </div>
  );
}
