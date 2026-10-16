import type { Metadata } from "next";
import { SelectAdvisorChat } from "@/components/select/select-advisor-chat";

export const metadata: Metadata = {
  title: "Klarone Select — AI Laptop Advisor",
  description:
    "Chat with Klarone Select AI to find the right laptop for your exact workload, budget, and lifestyle in Kolkata.",
};

export default function SelectPage() {
  return <SelectAdvisorChat />;
}
