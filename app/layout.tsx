import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "TalentFlow | ATS", description: "A focused applicant tracking system." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
