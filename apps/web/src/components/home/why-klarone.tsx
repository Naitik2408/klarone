const reasons = [
  {
    number: "01",
    label: "Choose",
    title: "Start with your needs",
    description:
      "Tell Klarone what you actually do, what you want to spend, and what matters to you. The goal is to narrow the options without making you decode a wall of specifications.",
  },
  {
    number: "02",
    label: "Own",
    title: "Get help close to home",
    description:
      "Klarone is being built Kolkata-first, with local support for the ownership problems that do not end when the order arrives.",
  },
  {
    number: "03",
    label: "Keep going",
    title: "Stay supported after purchase",
    description:
      "Repairs, upgrades, warranty-related help and future ownership needs can remain part of the Klarone relationship.",
  },
];

export function WhyKlarone() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Why Klarone
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The laptop is only the beginning.
            </h2>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Buying a laptop is one transaction. Choosing the right one,
              getting help when something goes wrong, and keeping it useful
              over time are the parts that matter after the purchase.
            </p>

            <div className="mt-8 hidden h-px w-24 bg-blue-500 lg:block" />
          </div>

          <div className="grid gap-4">
            {reasons.map((reason) => (
              <article
                key={reason.number}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:border-slate-300 hover:bg-slate-[0.98] sm:p-7"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {reason.number}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                      {reason.label}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      {reason.title}
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {reason.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
