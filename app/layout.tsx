import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudyDesk — Sistema de Estudos',
  description: 'Organize seus estudos com cadernos, questões e flashcards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
