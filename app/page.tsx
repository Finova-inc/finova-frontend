import { AboutSection } from "@/components/landing/AboutSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { ModuleStrip } from "@/components/landing/ModuleStrip";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TrustSection } from "@/components/landing/TrustSection";
import { Reveal } from "@/components/ui/Reveal";
import { serifFont } from "@/lib/fonts";

/**
 * Página de inicio de Finova.
 *
 * Es solo una raíz de composición: no tiene lógica ni marcado propio, ordena las
 * secciones. Cada una vive en su archivo, lo que mantiene los archivos revisables
 * y permite mover el orden sin tocar el contenido.
 *
 * El envoltorio .landing activa el tema oscuro propio de la landing
 * (globals.css, `.dark:has(.landing)`); `contents` hace que no exista como
 * caja, así que no altera el layout del body. También lleva la variable de la
 * serifa del titular, para que next/font la precargue solo en esta página.
 *
 * Detalle importante sobre Reveal: las secciones se pasan como `children` desde
 * aquí, que es un componente de servidor. Así siguen renderizándose en el
 * servidor aunque Reveal sea de cliente. Si se importaran dentro de Reveal
 * pasarían al bundle del navegador sin que nada lo advirtiera.
 *
 * HeroSection queda fuera de Reveal: trae su propia entrada escalonada, y
 * envolverla sumaría un segundo movimiento encima.
 */
export default function LandingPage() {
    return (
        <div className={`${serifFont.variable} landing contents`}>
            <SiteHeader />

            <main className="flex-1">
                <HeroSection />

                <ModuleStrip />

                <Reveal>
                    <AboutSection />
                </Reveal>

                <Reveal>
                    <FeaturesSection />
                </Reveal>

                <Reveal>
                    <PricingSection />
                </Reveal>

                <Reveal>
                    <TrustSection />
                </Reveal>

                <Reveal>
                    <FaqSection />
                </Reveal>
            </main>

            <SiteFooter />
        </div>
    );
}
