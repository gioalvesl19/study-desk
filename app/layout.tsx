import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudyDesk',
  description: 'Estude como um jogo. Cadernos, questões e flashcards.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
