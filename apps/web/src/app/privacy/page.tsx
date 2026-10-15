import Link from "next/link";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";

export const metadata = {
  title: "Privacy Policy — Klarone",
  description: "Privacy Policy and data protection standards for Klarone users in India.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      <StorefrontHeader />
      <main className="mx-auto max-w-4xl px-6 pt-36 pb-24 text-stone-300">
        <h1 className="font-serif text-4xl sm:text-5xl text-white tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-xs uppercase tracking-widest text-emerald-400">Last updated: October 2026</p>
        
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-300">
          <p>
            At Klarone, we respect your privacy and are committed to protecting the personal information you share with us. This policy describes how we collect, use, and protect your data when accessing our platform and services.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">1. Information We Collect</h2>
          <p>
            We collect personal information you provide directly, such as your name, email address, phone number, and delivery address during account creation, consultation requests, or laptop purchases.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">2. How We Use Your Information</h2>
          <p>
            Your information is used strictly to process orders, verify authentic hardware warranties, provide customer support in Kolkata, and personalize laptop recommendations via Klarone Select.
          </p>
          <h2 className="text-xl font-semibold text-white pt-4">3. Data Security & Storage</h2>
          <p>
            We implement enterprise-grade security protocols, encryption in transit (HTTPS), and secure authentication mechanisms to safeguard all customer credentials and records.
          </p>
          <p className="pt-6 text-stone-400">
            For questions regarding privacy, please contact our data team at{" "}
            <a href="mailto:privacy@klarone.in" className="text-emerald-400 underline">privacy@klarone.in</a>.
          </p>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}
