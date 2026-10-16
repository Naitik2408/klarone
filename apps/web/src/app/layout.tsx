import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export const metadata: Metadata = {
    title: {
        default: "Klarone — Laptop Ownership Ecosystem | Kolkata",
        template: "%s | Klarone",
    },
    description:
        "Klarone is a laptop ownership ecosystem in Kolkata. Tell Klarone what you need: choose the right laptop with AI guidance, purchase authentic units with local support, setup, upgrades, and lifetime care.",
    keywords: [
        "Klarone",
        "Klarone Select",
        "laptop Kolkata",
        "laptop recommendation",
        "buy laptop Kolkata",
        "laptop repair Kolkata",
        "laptop upgrade Kolkata",
        "Krishna Infotech Solution",
    ],
    authors: [{ name: "Klarone / Krishna Infotech Solution" }],
    openGraph: {
        title: "Klarone — Laptop Ownership Ecosystem | Kolkata",
        description:
            "Tell Klarone what you need. Klarone helps you choose what actually fits, buy authentic hardware, and get lifetime local support and upgrades in Kolkata.",
        siteName: "Klarone",
        locale: "en_IN",
        type: "website",
    },
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