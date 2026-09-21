import Link from "next/link";

export function HomeHero() {
  return (
    <section className="overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">
            Kolkata-first laptop commerce & support
          </div>

          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Buy the right laptop,
            <span className="block text-blue-400">
              not just a laptop.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            Klarone helps you choose a laptop around
            how you actually work, study, create, or
            play — then stays with you after the sale.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/laptops"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50"
            >
              Browse laptops
            </Link>

            <Link
              href="#klarone-select"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Try Klarone Select
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            <span>AI-assisted recommendations</span>
            <span>Local support</span>
            <span>Long-term ownership help</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-xl">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Klarone Select
                    </p>

                    <p className="mt-2 text-lg font-semibold text-white">
                      Tell us what you need.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    ✦
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  <div className="rounded-xl bg-white/[0.06] p-4">
                    <p className="text-xs text-slate-500">
                      Work
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      Office, development & multitasking
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.06] p-4">
                    <p className="text-xs text-slate-500">
                      Budget
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      Around ₹60,000
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.06] p-4">
                    <p className="text-xs text-slate-500">
                      Priority
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      Performance + reliability
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-blue-600 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue-200">
                    Klarone recommendation
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    A balanced 16GB / 512GB laptop
                    could fit this requirement.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-blue-100">
                    Recommendations are based on your
                    needs and the products available in
                    the Klarone catalogue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}