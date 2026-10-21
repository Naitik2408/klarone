import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../components/cart/cart-provider";
import { CustomerAuthProvider } from "@/components/auth/customer-auth-provider";

const sansFont = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const serifFont = Instrument_Serif({
    variable: "--font-serif",
    subsets: ["latin"],
    weight: ["400"],
    style: ["normal", "italic"],
    display: "swap",
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

// Root LocalBusiness & Organization Schema for Google Knowledge Graph & Local SEO
const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Klarone",
    alternateName: "Krishna Infotech Solution",
    description:
        "Laptop Ownership Ecosystem in Kolkata offering AI-guided laptop advisory, authentic brand sales, white-glove setup, repairs, and lifetime hardware upgrades.",
    url: "https://klarone.com",
    telephone: "+91 98300 00000",
    priceRange: "₹₹₹",
    address: {
        "@type": "PostalAddress",
        addressLocality: "Kolkata",
        addressRegion: "West Bengal",
        addressCountry: "IN",
    },
    geo: {
        "@type": "GeoCoordinates",
        latitude: "22.5726",
        longitude: "88.3639",
    },
    areaServed: [
        {
            "@type": "City",
            name: "Kolkata",
        },
        {
            "@type": "AdministrativeArea",
            name: "West Bengal",
        },
    ],
    openingHoursSpecification: [
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ],
            opens: "10:00",
            closes: "20:00",
        },
    ],
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
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(organizationJsonLd),
                    }}
                />
            </head>
            <body className="antialiased">
                <CustomerAuthProvider>
                    <CartProvider>{children}</CartProvider>
                </CustomerAuthProvider>
            </body>
        </html>
    );
}
