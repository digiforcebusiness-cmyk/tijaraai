import Link from "next/link";
import { Bot, Zap, Globe, Shield, Users, TrendingUp, Heart, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos — Tijara AI",
  description: "Tijara AI est une plateforme d'automatisation WhatsApp fondée au Maroc pour aider les marchands e-commerce à automatiser leurs ventes, support client et campagnes marketing.",
};

const STATS = [
  { value: "10K+", label: "Marchands actifs" },
  { value: "500K+", label: "Messages automatisés" },
  { value: "15+", label: "Pays couverts" },
  { value: "4.8★", label: "Note moyenne" },
];

const VALUES = [
  {
    icon: Heart,
    title: "Fait pour les marchands",
    desc: "Chaque fonctionnalité est conçue en écoutant de vrais marchands marocains. Leur réalité quotidienne est notre boussole.",
    color: "bg-pink-500/10 text-pink-400",
  },
  {
    icon: Zap,
    title: "Simplicité avant tout",
    desc: "Pas d'API complexe, pas de configuration technique. Scannez un QR code et vous êtes opérationnel en 30 secondes.",
    color: "bg-yellow-500/10 text-yellow-400",
  },
  {
    icon: Globe,
    title: "Ancré dans notre culture",
    desc: "Notre IA comprend la Darija et le français. Parce qu'automatiser en anglais dans un marché arabophone ne suffit pas.",
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    icon: Shield,
    title: "Confiance et sécurité",
    desc: "Vos sessions WhatsApp et données clients sont chiffrées et stockées en sécurité. Jamais partagées, jamais vendues.",
    color: "bg-green-500/10 text-green-400",
  },
];

const TEAM = [
  { name: "Équipe Produit", role: "Conception & développement", emoji: "🛠️" },
  { name: "Équipe IA", role: "Modèles de langage & NLP", emoji: "🤖" },
  { name: "Équipe Support", role: "Accompagnement marchands", emoji: "💬" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Tijara AI</span>
          </Link>
          <Link href="/login" className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#128C7E] transition-colors">
            Commencer gratuitement
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-1.5 text-sm text-[#25D366]">
            <Heart className="h-3.5 w-3.5" />
            Fondé au Maroc, pour le Maroc et au-delà
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl">
            Nous automatisons le<br />
            <span className="text-[#25D366]">commerce digital</span><br />
            en Afrique du Nord
          </h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Tijara AI est né d'un constat simple : les marchands marocains perdent des heures chaque jour à répondre manuellement à des messages WhatsApp. Nous avons construit l'outil qu'ils méritaient — simple, rapide, et en Darija.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="text-3xl font-extrabold text-[#25D366]">{s.value}</div>
              <div className="mt-1 text-sm text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-sm text-[#25D366]">
                <TrendingUp className="h-4 w-4" />
                Notre mission
              </div>
              <h2 className="mb-6 text-3xl font-bold">
                Rendre l'automatisation accessible à chaque marchand
              </h2>
              <p className="mb-4 text-white/60 leading-relaxed">
                Trop longtemps, les outils d'automatisation étaient réservés aux grandes entreprises avec des équipes techniques. Tijara AI change ça.
              </p>
              <p className="text-white/60 leading-relaxed">
                Pour <strong className="text-white/90">$4.99/mois</strong>, un vendeur de Casablanca ou d'Agadir peut avoir le même niveau d'automatisation qu'une multinationale — sans une seule ligne de code.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Connecter WhatsApp en 30 secondes via QR code",
                "Répondre à 100 messages/jour sans effort manuel",
                "Créer des commandes automatiquement depuis le chat",
                "Envoyer des campagnes à 1 000 contacts en un clic",
                "S'intégrer à YouCan, Shopify et WooCommerce",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-[#25D366]" />
                  </div>
                  <span className="text-white/70 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Ce en quoi nous croyons</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${v.color}`}>
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">{v.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Une équipe passionnée</h2>
          <p className="mb-12 text-white/50">
            Des ingénieurs, designers et experts e-commerce unis autour d'une même vision : simplifier le commerce digital en Afrique.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 text-4xl">{t.emoji}</div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-1 text-xs text-white/40">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-3xl border border-[#25D366]/20 bg-[#25D366]/5 p-12">
            <h2 className="mb-4 text-3xl font-bold">Rejoignez 10 000+ marchands</h2>
            <p className="mb-8 text-white/50">
              Commencez votre essai gratuit de 14 jours. Aucune carte bancaire requise.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-8 py-4 font-semibold text-white hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/25">
              Démarrer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/30">© 2025 Tijara AI. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-white/70 hover:text-[#25D366] transition-colors">Confidentialité</Link>
            <Link href="/terms" className="text-white/70 hover:text-[#25D366] transition-colors">Conditions</Link>
            <Link href="/contact" className="text-white/70 hover:text-[#25D366] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
