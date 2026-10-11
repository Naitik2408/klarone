import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../components/cart/cart-provider";
import { CustomerAuthProvider } from "@/components/auth/customer-auth-provider";

const sansFont = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const serifFont = Instrument_Serif({
    variable: "--font-serif",
    subsets: ["latin"],
    weight: ["400"],
    style: ["normal", "italic"],
});

export const metadata: Metadata = {
    title: {
        default: "Klarone — Laptops, chosen for you",
        template: "%s | Klarone",
    },
    description:
        "Find the right laptop with Klarone. Compare laptops, get AI-assisted recommendations, and access local support in Kolkata.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${sansFont.variable} ${serifFont.variable}`}
            suppressHydrationWarning
        >
            <body
                className="min-h-screen bg-white font-sans text-slate-950 antialiased"
                suppressHydrationWarning
            >
                <CustomerAuthProvider>
                    <CartProvider>
                        {children}
                    </CartProvider>
                </CustomerAuthProvider>
            </body>
        </html>
    );
}