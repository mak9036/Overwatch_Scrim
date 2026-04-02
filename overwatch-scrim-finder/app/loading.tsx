export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_40%),#09090b] text-zinc-100">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500 border-r-orange-400" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-300">Loading</p>
      </div>
    </div>
  );
}
