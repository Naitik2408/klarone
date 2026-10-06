import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.05),transparent_26%)]" />

      <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-300">
            A better way to buy a laptop
          </div>

          <h1 className="mt-7 text-5xl font-semibold tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Buy the right laptop.
            <span className="block text-blue-400">
              Not just a laptop.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
            Tell Klarone what you need, what you want to spend, and how you
            work. We help you narrow down the right laptop — then stay with
            you for support, repairs and upgrades.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#klarone-select"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Find my laptop
            </Link>

            <Link
              href="/laptops"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Browse laptops
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl gap-4 border-t border-white/10 pt-7 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Klarone Select
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Recommendations around your needs.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Local support
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Help when you need setup or service.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Long-term help
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Repairs, upgrades and ownership support.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
          <div className="absolute -inset-10 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-2 shadow-2xl backdrop-blur">
            <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/95 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">
                    Klarone Select
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Start with your needs.
                  </p>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    The goal is not to show you every laptop. It is to help
                    you find the ones that actually fit.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-lg text-blue-400">
                  ✦
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      What you do
                    </span>
                    <span className="text-xs font-medium text-blue-300">
                      Selected
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-200">
                    Office, development & multitasking
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Budget
                    </span>
                    <span className="text-xs font-medium text-blue-300">
                      Flexible
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-200">
                    Around ₹60,000
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Priority
                    </span>
                    <span className="text-xs font-medium text-blue-300">
                      Important
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-200">
                    Performance + reliability
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-300">
                  What happens next
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold">
                      1
                    </div>
                    <p className="text-sm leading-5 text-slate-200">
                      Your requirements are understood.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold">
                      2
                    </div>
                    <p className="text-sm leading-5 text-slate-200">
                      Suitable Klarone catalogue options are narrowed down.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold">
                      3
                    </div>
                    <p className="text-sm leading-5 text-slate-200">
                      You get support beyond the purchase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
