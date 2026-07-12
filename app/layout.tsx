import './global.scss'

export const metadata = {
  title: "Auth Template",
  description:"A clean Next.js authentication template.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>   
  );
}
