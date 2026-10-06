import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../components/cart/cart-provider";
import { CustomerAuthProvider } from "@/components/auth/customer-auth-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
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
            data-scroll-behavior="smooth"
            className={`${geistSans.variable} ${geistMono.variable}`}
        >
            <body className="min-h-screen bg-white font-sans text-slate-950 antialiased">
                <CustomerAuthProvider>
                    <CartProvider>
                        {children}
                    </CartProvider>
                </CustomerAuthProvider>
            </body>
        </html>
    );
}