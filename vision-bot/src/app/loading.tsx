export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d0e12]">
      <div className="flex flex-col items-center gap-4">
        {/* Sleek animated glowing ring */}
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-r-2 border-indigo-500 border-r-transparent drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
        <p className="text-sm text-slate-400 animate-pulse font-mono tracking-widest">
          INITIALIZING...
        </p>
      </div>
    </div>
  );
}
