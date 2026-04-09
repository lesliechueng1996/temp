import type { Metadata } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import Sidebar from './_component/Sidebar';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'AIGatewaySandbox',
  description: 'AIGatewaySandbox',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="h-screen w-screen flex">
        <Sidebar className="shrink-0" />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
