import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"MB CoreX Leads",description:"Business discovery and outreach management for MB CoreX Software Company"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
