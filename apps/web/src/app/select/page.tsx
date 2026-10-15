import type { Metadata } from "next";
import { SelectAdvisorChat } from "@/components/select/select-advisor-chat";

export const metadata: Metadata = {
  title: "Klarone Select — AI Laptop Advisor",
  description:
    "Chat with Klarone Select AI to find the right laptop for your exact workload, budget, and lifestyle in Kolkata.",
};

export default function SelectPage() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f0f2ee] font-sans antialiased text-slate-950 selection:bg-[#d6f088] selection:text-slate-950">
      <main className="flex-1 overflow-hidden">
        <SelectAdvisorChat />
      </main>
    </div>
  );
}
