import { Cinzel, JetBrains_Mono, Noto_Sans_TC } from 'next/font/google';

export const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
});

export const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/** Combined class string for the root layout `<body>`. */
export const fontVariables = `${notoSansTC.variable} ${cinzel.variable} ${jetbrainsMono.variable}`;
