import Epsilon from "@/components/Epsilon";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl space-y-10">
        <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)] rotate-12">
           <span className="text-5xl">⚡</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-8xl font-black text-white tracking-[0.2em]">
            EPSILON
          </h1>
          <p className="text-cyan-500 font-black tracking-[0.5em] text-sm uppercase">Vision Core System</p>
        </div>
        <p className="text-lg text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
          The next generation of desktop intelligence. Epsilon sees what you see,
          processing your environment with neural speed.
        </p>
        
        <div className="pt-10 flex flex-col items-center gap-5">
           <div className="px-6 py-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl text-cyan-400 font-mono text-sm shadow-[0_0_20px_rgba(6,182,212,0.1)]">
             $ npm run dev:electron
           </div>
           <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black">Ready for Deployment to Vercel</p>
        </div>
      </div>
    </main>
  );
}
