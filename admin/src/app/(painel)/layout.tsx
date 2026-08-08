import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/auth";
import { sairAction } from "@/lib/actions/logout-action";

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirSessaoAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[#262B33] px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-bold">AbastecAI — Admin</span>
          <nav className="flex gap-4 text-sm text-[#8A9099]">
            <Link href="/" className="hover:text-white">
              Início
            </Link>
            <Link href="/patrocinios" className="hover:text-white">
              Patrocínios
            </Link>
            <Link href="/avaliacoes" className="hover:text-white">
              Avaliações
            </Link>
            <Link href="/notificacoes" className="hover:text-white">
              Notificações
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#8A9099]">
          <span>{sessao.nome ?? sessao.email}</span>
          <form action={sairAction}>
            <button type="submit" className="hover:text-white">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
