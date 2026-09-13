import { Icon } from "@/components/ui/Icon";

/**
 * Aviso de que parte del panel muestra datos de ejemplo.
 *
 * No es un adorno ni una nota para el equipo: es lo que separa una maqueta
 * honesta de una interfaz que engana. En una herramienta contable, una cifra
 * sin marcar se lee como el saldo real de la empresa de quien mira.
 *
 * Se borra en la Fase 6, cuando ya no queden bloques sin origen de datos.
 */
export function AvisoMaqueta() {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-[rgb(255_197_61_/_0.4)] bg-[var(--aviso-bg)] px-4 py-3 text-[12.5px] leading-relaxed">
            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-[var(--aviso)]" />
            <p className="min-w-0">
                <strong className="font-semibold">Maqueta de diseño.</strong> Las cifras
                marcadas son de ejemplo. Hoy el backend entrega empresas, terceros,
                cuentas, documentos y asientos; la conciliación bancaria, los
                vencimientos y el flujo de caja aún no tienen origen de datos.
            </p>
        </div>
    );
}
