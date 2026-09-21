const reasons = [
  {
    number: "01",
    title: "Choose around your needs",
    description:
      "Start with what you actually do on your laptop. Klarone is designed to help you narrow the options instead of forcing you to decode a wall of specifications.",
  },
  {
    number: "02",
    title: "Get help close to home",
    description:
      "Klarone is being built Kolkata-first, with local support for the ownership problems that do not end when the order arrives.",
  },
  {
    number: "03",
    title: "Stay supported after purchase",
    description:
      "Repairs, upgrades, warranty-related help and future ownership needs can remain part of the Klarone relationship.",
  },
];

export function WhyKlarone() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Why Klarone
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The laptop is only the beginning.
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600">
              Buying a laptop is easy. Knowing which one
              actually fits, getting help when something
              goes wrong, and keeping it useful for years
              is harder.
            </p>
          </div>

          <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-slate-50">
            {reasons.map((reason) => (
              <div
                key={reason.number}
                className="grid gap-4 p-6 sm:grid-cols-[72px_1fr] sm:p-8"
              >
                <div className="text-sm font-semibold tracking-[0.1em] text-slate-400">
                  {reason.number}
                </div>

                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {reason.title}
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {reason.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}