import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TreeInspector - Sistema de Gestão de Inspeção de Árvores',
  description: 'Plataforma completa para inspeção, monitoramento e gestão de árvores urbanas com tecnologia Mobile First e análise de risco ABNT NBR 16246-3.',
  keywords: [
    'inspeção de árvores',
    'arborização urbana',
    'gestão ambiental',
    'ABNT NBR 16246-3',
    'monitoramento arbóreo',
    'análise de risco',
    'GIS',
    'mobile first'
  ],
  authors: [{ name: 'TreeInspector Team' }],
  creator: 'TreeInspector',
  publisher: 'TreeInspector',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://treeinspector.netlify.app'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://treeinspector.netlify.app',
    title: 'TreeInspector - Sistema de Gestão de Inspeção de Árvores',
    description: 'Plataforma completa para inspeção, monitoramento e gestão de árvores urbanas.',
    siteName: 'TreeInspector',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TreeInspector - Sistema de Gestão de Inspeção de Árvores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TreeInspector - Sistema de Gestão de Inspeção de Árvores',
    description: 'Plataforma completa para inspeção, monitoramento e gestão de árvores urbanas.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#22c55e" />
        <meta name="msapplication-TileColor" content="#22c55e" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <div className="min-h-full">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}