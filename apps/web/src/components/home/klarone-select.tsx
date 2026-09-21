import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Tell us what you do",
    description:
      "Share your work, study, creative, gaming or everyday laptop requirements in plain language.",
  },
  {
    number: "02",
    title: "Set your priorities",
    description:
      "Budget, performance, portability, battery life and other priorities help narrow the catalogue.",
  },
  {
    number: "03",
    title: "Understand the options",
    description:
      "Klarone combines your requirements with structured product data to explain which available options fit.",
  },
];

export function KlaroneSelect() {
  return (
    <section
      id="klarone-select"
      className="bg-slate-100 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Klarone Select
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Stop searching by specifications.
              Start choosing by requirements.
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600">
              Klarone Select is designed to turn the way
              you describe your needs into a more useful
              shortlist of laptops from the Klarone
              catalogue.
            </p>

            <Link
              href="/laptops"
              className="mt-7 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
            >
              Explore the catalogue
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  How it works
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-950">
                  A simpler way to narrow the choice.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
                ✦
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid gap-4 py-6 sm:grid-cols-[56px_1fr]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Klarone principle
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                AI helps understand and explain your
                requirements. The actual product ranking
                remains grounded in Klarone&apos;s structured
                catalogue data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}