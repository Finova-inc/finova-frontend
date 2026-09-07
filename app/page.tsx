import { AboutSection } from "@/components/landing/AboutSection";
import { AsciiBanner } from "@/components/landing/AsciiBanner";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TrustSection } from "@/components/landing/TrustSection";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Página de inicio de Finova.
 *
 * Es solo una raíz de composición: no tiene lógica ni marcado propio, ordena las
 * secciones. Cada una vive en su archivo, lo que mantiene los archivos revisables
 * y permite mover el orden sin tocar el contenido.
 *
 * Detalle importante sobre Reveal: las secciones se pasan como `children` desde
 * aquí, que es un componente de servidor. Así siguen renderizándose en el
 * servidor aunque Reveal sea de cliente. Si se importaran dentro de Reveal
 * pasarían al bundle del navegador sin que nada lo advirtiera.
 *
 * Dos secciones quedan fuera de Reveal a propósito:
 * - HeroSection, porque está sobre la línea de flotación y animar su entrada
 *   perjudicaría la métrica LCP.
 * - AsciiBanner, porque es una banda divisoria que trae su propia animación
 *   continua; envolverla sumaría un segundo movimiento sin ganancia.
 */
export default function LandingPage() {
    return (
        <>
            <SiteHeader />

            <main className="flex-1">
                <HeroSection />

                <AsciiBanner />

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
        </>
    );
}
