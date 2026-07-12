import './global.scss'

export const metadata = {
  title: "Assest Flow",
  description:"Assest Flow is a comprehensive, centralized platform designed to modernize and streamline how organizations manage their assets, resources, departments, and maintenance schedules.",
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
