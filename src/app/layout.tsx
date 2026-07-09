import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMP CSR Portal",
  description: "Customer service portal for AMP car wash memberships",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <Providers>
            <AppBar position="static" color="primary" enableColorOnDark>
              <Toolbar>
                <Typography variant="h6" component="div">
                  AMP CSR Portal
                </Typography>
              </Toolbar>
            </AppBar>
            {children}
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
