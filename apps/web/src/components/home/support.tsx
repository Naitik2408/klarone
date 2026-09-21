import Link from "next/link";

const services = [
  {
    title: "Local troubleshooting",
    description:
      "Get help with the practical problems that can appear after you bring a laptop home.",
  },
  {
    title: "Repairs & upgrades",
    description:
      "Keep the device useful longer with repair and upgrade support when the need arises.",
  },
  {
    title: "Warranty guidance",
    description:
      "When something goes wrong, Klarone can help you understand the next step instead of leaving you to figure it out alone.",
  },
];

export function KolkataSupport() {
  return (
    <section
      id="support"
      className="bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Kolkata-first support
            </p>

            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your relationship with Klarone should not end at checkout.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              A laptop is something you live with for years.
              Klarone is being built around that reality —
              with local support for the ownership journey,
              not just the transaction.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-base font-semibold text-slate-950">
                    {service.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Built for ownership
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-lg font-semibold">
                  Buy
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Choose a laptop based on what you
                  actually need.
                </p>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="text-lg font-semibold">
                  Use
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Get help when the real-world ownership
                  questions begin.
                </p>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="text-lg font-semibold">
                  Maintain
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Repair, upgrade and continue getting value
                  from the device.
                </p>
              </div>
            </div>

            <Link
              href="/laptops"
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50"
            >
              Start with a laptop
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}