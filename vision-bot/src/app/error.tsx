"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if configured
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0d0e12] p-4 text-center">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Connection Interrupted
          </h2>
          <p className="max-w-[300px] text-sm text-slate-400">
            Epsilon encountered an unexpected anomaly while rendering this interface.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95"
        >
          Reboot Interface
        </button>
      </div>
    </div>
  );
}
