import { PaginaBalance } from "../PaginaBalance";
import type { Parametros } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Balance de comprobación" };

export default function BalanceComprobacionPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    return <PaginaBalance variante="comprobacion" searchParams={searchParams} />;
}
