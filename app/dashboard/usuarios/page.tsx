/* ============================================================================
   /dashboard/usuarios — personas con acceso a la empresa activa.

   Solo el administrador las gestiona: da acceso (crea la cuenta o, si el RUT
   ya tiene una en Finova, solo le agrega esta empresa), cambia el rol y quita
   el acceso. Los cambios rigen de inmediato: el backend revisa la pertenencia
   en cada petición.

   Server Component: la lista se pide con la cookie httpOnly; los cambios van
   por Server Actions (actions.ts).
   ========================================================================== */

import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, usuariosApi, type MiembroEmpresa } from "@/lib/api";
import { formatearFecha } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, obtenerUsuarioDelToken, ROL } from "@/lib/session";
import { nombreRol, ROLES } from "@/lib/usuarios";
import { Aviso, CLASES_TH, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { AccionesMiembro } from "./AccionesMiembro";
import { FormularioUsuario } from "./FormularioUsuario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

const REGLAS: readonly string[] = [
    "Cada persona entra con su RUT. Si ya tiene cuenta en Finova (por ejemplo, una contadora que lleva otras empresas), basta su RUT y el rol: entra con su contraseña de siempre.",
    "El rol es por empresa: la misma persona puede ser administradora en una empresa y solo consulta en otra.",
    ...ROLES.map((r) => `${r.nombre}: ${r.permite}`),
    "Quitar el acceso no borra la cuenta ni lo que la persona registró: deja de poder entrar a esta empresa desde ese momento.",
    "La empresa siempre conserva al menos un administrador, y nadie puede quitarse el acceso a sí mismo.",
];

const CELDA = "px-4 py-2.5";

export default async function UsuariosPage() {
    const token = await exigirTokenSesion();
    const [rol, yo] = await Promise.all([obtenerRolDelToken(), obtenerUsuarioDelToken()]);

    const encabezado = (
        <Encabezado
            titulo="Usuarios"
            descripcion="Quiénes tienen acceso a esta empresa y con qué rol. Solo el administrador los gestiona."
        />
    );

    if (rol !== ROL.ADMINISTRADOR) {
        return (
            <div className="flex flex-col gap-4">
                {encabezado}
                <Aviso>Solo el administrador de la empresa puede ver y gestionar los usuarios.</Aviso>
            </div>
        );
    }

    let miembros: MiembroEmpresa[] | null = null;
    let sinPermiso = false;
    try {
        miembros = await usuariosApi.listar({ token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        // El token dice administrador, pero el backend revisa el rol vigente:
        // si se lo cambiaron, responde 403.
        if (error instanceof ApiError && error.status === 403) sinPermiso = true;
    }

    return (
        <div className="flex flex-col gap-4">
            {encabezado}

            <Guia titulo="Cómo funcionan los usuarios y los roles">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            {sinPermiso ? (
                <Aviso tono="aviso">Tu rol en esta empresa cambió y ya no eres administrador. Vuelve a iniciar sesión.</Aviso>
            ) : !miembros ? (
                <Aviso tono="critico">
                    No pudimos cargar los usuarios. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                    recarga la página.
                </Aviso>
            ) : (
                <>
                    <Panel sinRelleno>
                        <div className="px-5 pt-4">
                            <PanelCabecera
                                titulo={`${miembros.length} ${miembros.length === 1 ? "persona" : "personas"} con acceso`}
                                nota={`${miembros.filter((m) => m.id_rol === ROL.ADMINISTRADOR).length} administradores`}
                            />
                        </div>
                        <div className="overflow-x-auto pt-2">
                            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                                <thead className="border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th scope="col" className={CLASES_TH}>Persona</th>
                                        <th scope="col" className={CLASES_TH}>RUT</th>
                                        <th scope="col" className={CLASES_TH}>Acceso desde</th>
                                        <th scope="col" className={`${CLASES_TH} text-right`}>Rol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {miembros.map((m) => (
                                        <tr key={m.id_usuario} className="border-b border-[var(--border-subtle)] align-top last:border-0">
                                            <td className={CELDA}>
                                                <p className="font-medium">
                                                    {m.nombre_completo}
                                                    {m.id_usuario === yo ? <span className="ml-1.5 text-[12px] font-normal text-[var(--foreground-muted)]">(tú)</span> : null}
                                                </p>
                                                <p className="text-[12px] text-[var(--foreground-muted)]">{m.correo}</p>
                                                {!m.is_active ? <Etiqueta tono="aviso">Cuenta desactivada</Etiqueta> : null}
                                            </td>
                                            <td className={`tabular ${CELDA} whitespace-nowrap`}>{m.rut ?? "—"}</td>
                                            <td className={`tabular ${CELDA}`}>{formatearFecha(m.desde)}</td>
                                            <td className={`${CELDA} text-right`}>
                                                <span className="sr-only">{nombreRol(m.id_rol)}</span>
                                                <AccionesMiembro id={m.id_usuario} nombre={m.nombre_completo} rol={m.id_rol} esUnoMismo={m.id_usuario === yo} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel>
                        <PanelCabecera titulo="Dar acceso a una persona" />
                        <div className="mt-3">
                            <FormularioUsuario />
                        </div>
                    </Panel>
                </>
            )}
        </div>
    );
}
