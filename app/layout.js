import "./globals.css";

export const metadata = {
  title: "Genius Metrics — Diagnóstico Inteligente de Funil",
  description: "Analise seu funil de dropshipping com IA e receba um diagnóstico completo com plano de ação.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
