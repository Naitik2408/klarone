import Link from "next/link";

const services = [
  {
    step: "01",
    title: "Local troubleshooting",
    description:
      "Get help with practical problems that can appear after you bring a laptop home.",
  },
  {
    step: "02",
    title: "Repairs & upgrades",
    description:
      "Keep the device useful longer with repair and upgrade support when the need arises.",
  },
  {
    step: "03",
    title: "Warranty guidance",
    description:
      "When something goes wrong, get help understanding the next step instead of figuring it out alone.",
  },
];

export function KolkataSupport() {
  return (
    <section
      id="support"
      className="border-t border-slate-200 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Kolkata-first support
            </div>

            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your relationship with Klarone should not end at checkout.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              A laptop is something you live with for years. Klarone is being
              built around that reality — with local support for the ownership
              journey, not just the transaction.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.step}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {service.step}
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-slate-950">
                    {service.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {service.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
              Built for ownership
            </p>

            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Buy it. Use it. Keep it useful.
            </h3>

            <div className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  1
                </div>

                <div>
                  <p className="font-semibold">Buy</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Choose a laptop around what you actually need.
                  </p>
                </div>
              </div>

              <div className="ml-5 h-px bg-white/10" />

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  2
                </div>

                <div>
                  <p className="font-semibold">Use</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Get help when real-world ownership questions begin.
                  </p>
                </div>
              </div>

              <div className="ml-5 h-px bg-white/10" />

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                  3
                </div>

                <div>
                  <p className="font-semibold">Maintain</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Repair, upgrade and continue getting value from the device.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/laptops"
              className="mt-9 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              Start with a laptop
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
