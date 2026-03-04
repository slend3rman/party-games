import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Party Games — Play Together',
  description: 'Host party games with friends. No downloads needed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-party min-h-screen">
        {children}
      </body>
    </html>
  );
}
