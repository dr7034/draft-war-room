import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { LeagueContextProvider } from '@/context/league-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fantasy War Room',
  description: 'AI-powered draft helper for Sleeper leagues',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LeagueContextProvider>
          {children}
          <Toaster />
          </LeagueContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}