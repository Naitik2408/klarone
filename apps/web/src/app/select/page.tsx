import type { Metadata } from "next";
import { SelectAdvisorChat } from "@/components/select/select-advisor-chat";

export const metadata: Metadata = {
  title: "Klarone Select — AI Laptop Advisor & Specification Fit",
  description:
    "Tell Klarone what you need. Klarone Select combines AI guidance and objective specification scoring to shortlist laptops that actually fit your workload, budget, and lifestyle in Kolkata.",
  openGraph: {
    title: "Klarone Select — AI Laptop Advisor & Specification Fit",
    description:
      "Understand what you actually need. Klarone Select shortlists authentic laptops, explains trade-offs, and provides local support across Kolkata.",
  },
};

export default function SelectPage() {
  return <SelectAdvisorChat />;
}
