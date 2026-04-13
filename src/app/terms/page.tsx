import Link from "next/link";
import { Bot, FileText } from "lucide-react";

export const metadata = { title: "Conditions d'utilisation — Tijara AI" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Tijara AI</span>
          </Link>
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Conditions d&apos;utilisation</h1>
            <p className="mt-2 text-white/40 text-sm">Dernière mise à jour : janvier 2025</p>
          </div>
        </div>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Acceptation des conditions</h2>
            <p>
              En accédant à la plateforme Tijara AI et en utilisant nos services, vous acceptez d&apos;être lié par
              les présentes conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas
              utiliser notre service. Ces conditions constituent un accord légal entre vous et Tijara AI.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Description du service</h2>
            <p>Tijara AI est une plateforme d&apos;automatisation WhatsApp qui propose :</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li>La connexion de comptes WhatsApp via QR code</li>
              <li>Un chatbot IA pour la gestion automatique des conversations</li>
              <li>La création automatique de commandes à partir des conversations</li>
              <li>L&apos;envoi de campagnes et messages en masse</li>
              <li>L&apos;intégration avec les plateformes e-commerce (Shopify, WooCommerce, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Conditions d&apos;éligibilité</h2>
            <p>Pour utiliser Tijara AI, vous devez :</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li>Avoir au moins 18 ans ou l&apos;âge de la majorité dans votre pays</li>
              <li>Disposer d&apos;une adresse e-mail valide</li>
              <li>Utiliser le service à des fins légales et commerciales légitimes</li>
              <li>Respecter les conditions d&apos;utilisation de WhatsApp et de Meta</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Comptes utilisateurs</h2>
            <p>
              Vous êtes responsable de la sécurité de votre compte et de votre mot de passe. Toute activité
              effectuée sous votre compte est de votre responsabilité. Vous devez nous notifier immédiatement
              de tout accès non autorisé à votre compte. Tijara AI ne sera pas responsable des pertes résultant
              d&apos;un accès non autorisé à votre compte.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Utilisation acceptable</h2>
            <p>Vous vous engagez à ne pas utiliser Tijara AI pour :</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li>Envoyer des spams, messages non sollicités ou contenu trompeur</li>
              <li>Violer les conditions d&apos;utilisation de WhatsApp ou de Meta</li>
              <li>Diffuser du contenu illégal, offensant, ou portant atteinte à des droits tiers</li>
              <li>Tenter de contourner les systèmes de sécurité de la plateforme</li>
              <li>Revendre ou redistribuer l&apos;accès au service sans autorisation</li>
              <li>Mener des activités frauduleuses ou illégales</li>
            </ul>
            <p className="mt-3">
              Tout manquement à ces règles peut entraîner la suspension immédiate de votre compte sans remboursement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Abonnements et paiements</h2>
            <p>
              Tijara AI propose des abonnements mensuels. L&apos;abonnement se renouvelle automatiquement chaque mois
              sauf résiliation. Les tarifs peuvent être modifiés avec un préavis de 30 jours.
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white/80">Essai gratuit</strong> : 14 jours sur tous les plans, sans carte bancaire requise</li>
              <li><strong className="text-white/80">Résiliation</strong> : vous pouvez résilier à tout moment depuis vos paramètres</li>
              <li><strong className="text-white/80">Remboursements</strong> : les paiements effectués ne sont pas remboursables, sauf disposition légale contraire</li>
              <li><strong className="text-white/80">Limites</strong> : les quotas inutilisés (messages, tokens) ne sont pas reportés au mois suivant</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Propriété intellectuelle</h2>
            <p>
              La plateforme Tijara AI, y compris son code source, son design, ses marques et son contenu,
              est protégée par les lois sur la propriété intellectuelle. Vous ne pouvez pas copier, modifier,
              distribuer ou créer des œuvres dérivées sans notre autorisation écrite.
            </p>
            <p className="mt-3">
              Vos données et le contenu que vous créez sur la plateforme restent votre propriété.
              Vous nous accordez une licence limitée pour les traiter dans le cadre de la fourniture du service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Disponibilité du service</h2>
            <p>
              Tijara AI s&apos;efforce de maintenir une disponibilité de 99,9 % mais ne garantit pas un service
              ininterrompu. Des maintenances planifiées peuvent occasionner de courtes interruptions.
              Nous ne sommes pas responsables des pannes causées par des tiers (WhatsApp, hébergeurs, etc.).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Limitation de responsabilité</h2>
            <p>
              Dans les limites permises par la loi, Tijara AI ne sera pas responsable des dommages indirects,
              consécutifs, spéciaux ou exemplaires découlant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser
              le service. Notre responsabilité totale est limitée au montant payé pour le service au cours
              des 3 derniers mois.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Résiliation</h2>
            <p>
              Vous pouvez résilier votre compte à tout moment depuis la page Paramètres. Tijara AI se réserve
              le droit de suspendre ou résilier votre accès en cas de violation des présentes conditions,
              sans préavis ni remboursement. À la résiliation, vos données seront supprimées après 30 jours.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">11. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit en vigueur. Tout litige sera soumis à la
              compétence exclusive des tribunaux compétents. Si une clause est jugée invalide, les autres
              clauses restent pleinement applicables.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">12. Modifications des conditions</h2>
            <p>
              Tijara AI peut modifier ces conditions à tout moment. Les modifications importantes vous seront
              communiquées par e-mail avec un préavis de 30 jours. La poursuite de l&apos;utilisation du service
              après ce délai vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">13. Contact</h2>
            <p>
              Pour toute question concernant ces conditions, contactez-nous à{" "}
              <a href="mailto:legal@tijarabot.com" className="text-[#25D366] hover:underline">
                legal@tijarabot.com
              </a>{" "}
              ou via notre{" "}
              <Link href="/contact" className="text-[#25D366] hover:underline">
                page de contact
              </Link>
              .
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-4xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/30">© 2025 Tijara AI. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/terms" className="text-[#25D366]">Conditions</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
