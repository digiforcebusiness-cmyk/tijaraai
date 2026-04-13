import Link from "next/link";
import { Bot, Shield } from "lucide-react";

export const metadata = { title: "Politique de confidentialité — Tijara AI" };

export default function PrivacyPage() {
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10">
            <Shield className="h-6 w-6 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
            <p className="mt-2 text-white/40 text-sm">Dernière mise à jour : janvier 2025</p>
          </div>
        </div>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Collecte des données</h2>
            <p>
              Tijara AI collecte uniquement les informations nécessaires au fonctionnement de la plateforme. Cela inclut :
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li>Votre adresse e-mail et nom lors de la création de votre compte</li>
              <li>Les données de session WhatsApp (uniquement stockées localement sur le serveur)</li>
              <li>Les messages traités par notre système IA dans le cadre de vos automatisations</li>
              <li>Les informations de paiement (traitées de manière sécurisée par nos partenaires de paiement)</li>
              <li>Les journaux d&apos;utilisation et données d&apos;analyse anonymisées</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Utilisation des données</h2>
            <p>Nous utilisons vos données exclusivement pour :</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li>Fournir et améliorer les services Tijara AI</li>
              <li>Gérer votre compte et votre abonnement</li>
              <li>Traiter vos automatisations WhatsApp et campagnes</li>
              <li>Vous envoyer des notifications de service importantes</li>
              <li>Assurer la sécurité et prévenir les abus</li>
            </ul>
            <p className="mt-3">
              Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Données WhatsApp</h2>
            <p>
              Les sessions WhatsApp que vous connectez à Tijara AI sont gérées via une connexion QR code sécurisée.
              Les données de session sont chiffrées et stockées uniquement sur nos serveurs sécurisés.
              Les messages traités par notre IA ne sont pas conservés au-delà de la durée nécessaire au traitement,
              sauf si vous activez explicitement l&apos;historique des conversations dans vos paramètres.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Cookies et technologies similaires</h2>
            <p>
              Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme (authentification, préférences).
              Nous n&apos;utilisons pas de cookies publicitaires ou de suivi tiers. Les cookies de session expirent
              automatiquement après 30 jours d&apos;inactivité.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Sécurité des données</h2>
            <p>
              Tijara AI met en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger
              vos données contre tout accès non autorisé, perte ou destruction. Cela inclut le chiffrement SSL/TLS de
              toutes les communications, le hachage des mots de passe, et des audits de sécurité réguliers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Conservation des données</h2>
            <p>
              Vos données sont conservées pendant la durée de votre abonnement actif et jusqu&apos;à 30 jours après
              la résiliation de votre compte, délai pendant lequel vous pouvez demander la restauration.
              Après ce délai, toutes vos données sont définitivement supprimées.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Vos droits</h2>
            <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white/80">Accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong className="text-white/80">Rectification</strong> : corriger vos informations inexactes</li>
              <li><strong className="text-white/80">Suppression</strong> : demander la suppression de votre compte et de vos données</li>
              <li><strong className="text-white/80">Portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong className="text-white/80">Opposition</strong> : vous opposer à certains traitements</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:privacy@tijarabot.com" className="text-[#25D366] hover:underline">
                privacy@tijarabot.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Services tiers</h2>
            <p>Notre plateforme peut interagir avec des services tiers (Shopify, Meta, Google, etc.) uniquement avec votre consentement explicite. Ces services ont leurs propres politiques de confidentialité que nous vous encourageons à consulter.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique occasionnellement. En cas de changement significatif,
              nous vous en informerons par e-mail au moins 30 jours avant l&apos;entrée en vigueur des nouvelles dispositions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité, contactez notre équipe à{" "}
              <a href="mailto:privacy@tijarabot.com" className="text-[#25D366] hover:underline">
                privacy@tijarabot.com
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
            <Link href="/privacy" className="text-[#25D366]">Confidentialité</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Conditions</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
