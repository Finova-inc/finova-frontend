import { PaginaBalance } from "../PaginaBalance";
import type { Parametros } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Balance tributario" };

export default function BalanceTributarioPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    return <PaginaBalance variante="tributario" searchParams={searchParams} />;
}
