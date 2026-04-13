import Link from "next/link";
import { Bot, Mail, MessageSquare, Clock, MapPin } from "lucide-react";

export const metadata = { title: "Contact — Tijara AI" };

export default function ContactPage() {
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
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">Contactez-nous</h1>
          <p className="mt-3 text-white/50">Notre équipe est disponible pour répondre à toutes vos questions.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
                  <Mail className="h-5 w-5 text-[#25D366]" />
                </div>
                <div>
                  <p className="font-semibold">Support général</p>
                  <a href="mailto:support@tijarabot.com" className="text-sm text-[#25D366] hover:underline">
                    support@tijarabot.com
                  </a>
                </div>
              </div>
              <p className="text-sm text-white/50">Pour toute question sur votre compte, votre abonnement ou les fonctionnalités de la plateforme.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">Questions légales</p>
                  <a href="mailto:legal@tijarabot.com" className="text-sm text-blue-400 hover:underline">
                    legal@tijarabot.com
                  </a>
                </div>
              </div>
              <p className="text-sm text-white/50">Pour les questions relatives à nos conditions d&apos;utilisation, politique de confidentialité ou droits sur les données.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                  <Clock className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold">Horaires de support</p>
                  <p className="text-sm text-white/50">Lun – Ven, 9h – 18h (UTC+1)</p>
                </div>
              </div>
              <p className="text-sm text-white/50">Nous répondons généralement dans un délai de 24 heures ouvrables. Le support IA est disponible 24/7 dans l&apos;application.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                  <MapPin className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold">Tijara AI</p>
                  <p className="text-sm text-white/50">tijarabot.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="mb-6 text-xl font-semibold">Envoyer un message</h2>
            <form action="mailto:support@tijarabot.com" method="GET" className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Nom complet</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Votre nom"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Adresse e-mail</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Sujet</label>
                <select
                  name="subject"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white/70 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                >
                  <option value="support">Support technique</option>
                  <option value="billing">Facturation & abonnement</option>
                  <option value="feature">Demande de fonctionnalité</option>
                  <option value="legal">Question légale</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Message</label>
                <textarea
                  name="body"
                  required
                  rows={5}
                  placeholder="Décrivez votre question ou problème..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white hover:bg-[#128C7E] transition-colors"
              >
                Envoyer le message
              </button>
              <p className="text-center text-xs text-white/30">
                En soumettant ce formulaire, vous acceptez notre{" "}
                <Link href="/privacy" className="text-[#25D366] hover:underline">politique de confidentialité</Link>.
              </p>
            </form>
          </div>
        </div>

        {/* FAQ link */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">Consultez d&apos;abord notre FAQ</h2>
          <p className="mb-6 text-white/50 text-sm">
            La plupart des questions courantes sont déjà répondues sur notre page d&apos;accueil.
          </p>
          <Link
            href="/#faq"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm text-white/70 hover:border-white/40 hover:text-white transition-all"
          >
            Voir la FAQ
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-4xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/30">© 2025 Tijara AI. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Conditions</Link>
            <Link href="/contact" className="text-[#25D366]">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
