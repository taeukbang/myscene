import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyScene - 사진 중심 여행 장소 추천",
  description: "여행지에서 최고의 사진을 얻을 수 있는 장소를 찾아보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
