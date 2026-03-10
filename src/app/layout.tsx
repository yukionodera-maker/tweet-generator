import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ツイート生成ツール',
  description: '伸びているツイートを分析し、あなたのアカウントに合った文案を生成',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
