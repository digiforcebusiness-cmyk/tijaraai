import Link from "next/link";
import { Bot, MessageSquare, Zap, ShoppingCart, Send, Code2, Check, Star, ChevronRight, ArrowRight, Wifi, Shield, Globe } from "lucide-react";

const FEATURES = [
  { icon: Wifi, title: "WhatsApp QR Connect", desc: "Instantly connect any WhatsApp number via QR code scan. No complex API setup, no business verification needed — ready in 30 seconds.", color: "bg-green-500/10 text-green-500" },
  { icon: Bot, title: "AI Chatbot", desc: "Auto-reply to customer messages 24/7 using advanced AI. Handles support, extracts leads, and books orders — all in the customer's language.", color: "bg-violet-500/10 text-violet-500" },
  { icon: ShoppingCart, title: "Order Generation", desc: "AI automatically detects purchase intent in conversations and converts them into structured orders synced to your dashboard.", color: "bg-orange-500/10 text-orange-500" },
  { icon: MessageSquare, title: "Order Confirmation", desc: "Automatically send branded order confirmation messages via WhatsApp template messages. Supports Shopify, WooCommerce & more.", color: "bg-blue-500/10 text-blue-500" },
  { icon: Send, title: "Campaign Broadcasts", desc: "Send bulk messages to thousands of contacts instantly. Perfect for promotions, announcements, and wholesale offers.", color: "bg-pink-500/10 text-pink-500" },
  { icon: Code2, title: "Website Chat Widget", desc: "Add a WhatsApp chat button to your website with one line of code. Convert visitors into WhatsApp leads automatically.", color: "bg-cyan-500/10 text-cyan-500" },
];

const PLANS = [
  { name: "Starter", price: 4.99, profiles: 1, team: 1, campaigns: 500, confirmations: 500, tokens: "1K", storage: "1GB", popular: false },
  { name: "Advanced", price: 19, profiles: 3, team: 2, campaigns: 1000, confirmations: 1000, tokens: "5K", storage: "5GB", popular: false },
  { name: "Professional", price: 49, profiles: 5, team: 5, campaigns: 5000, confirmations: 5000, tokens: "20K", storage: "20GB", popular: true },
  { name: "Enterprise", price: 149, profiles: 10, team: "Unlimited", campaigns: 20000, confirmations: 20000, tokens: "70K", storage: "30GB", popular: false },
];

const FAQS = [
  { q: "Do I need a WhatsApp Business API account?", a: "No. We use a QR-code session approach — just scan the QR with your phone and you're live. No Meta approval required." },
  { q: "How does the AI chatbot work?", a: "Our AI engine understands incoming messages and generates natural replies. You can customize the system prompt for your business context." },
  { q: "Can I send bulk messages to all my contacts?", a: "Yes — the Campaigns feature lets you send broadcast messages to any selection of contacts from your connected WhatsApp sessions." },
  { q: "Is there a free trial?", a: "Yes — 14 days free, no credit card required. Full access to all features on the Professional plan during the trial." },
  { q: "What happens if I exceed my plan limits?", a: "We'll notify you when you approach limits. You can upgrade your plan anytime and it takes effect immediately." },
  { q: "Can I add team members?", a: "Yes — depending on your plan you can invite agents and admins to help manage conversations and orders." },
];

const STATS = [
  { value: "10K+", label: "Active Users" },
  { value: "500K+", label: "Messages Sent" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.8★", label: "Avg Rating" },
];

const INTEGRATIONS = ["Shopify", "WooCommerce", "YouCan", "LightFunnel", "Facebook", "Instagram"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Tijara AI</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            {["Features", "Pricing", "FAQ"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-white/60 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">Sign in</Link>
            <Link href="/login" className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#128C7E] transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#25D36620_0%,_transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-1.5 text-sm text-[#25D366]">
            <Zap className="h-3.5 w-3.5" />
            AI-powered WhatsApp automation platform
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Automate Your<br />
            <span className="text-[#25D366]">WhatsApp Business</span><br />
            with Smart AI
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/60">
            Connect your WhatsApp via QR, let AI handle customer support 24/7, generate orders from conversations, and broadcast campaigns — all from one dashboard.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login" className="flex items-center gap-2 rounded-xl bg-[#25D366] px-8 py-4 text-base font-semibold text-white hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/25">
              Start Free Trial — 14 days
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base text-white/70 hover:border-white/40 hover:text-white transition-all">
              See Features
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-3xl font-bold text-[#25D366]">{s.value}</div>
                <div className="mt-1 text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Everything you need to scale</h2>
            <p className="text-white/50">Six powerful modules working together seamlessly</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#25D366]/30 hover:bg-white/8 transition-all">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-4xl font-bold">Up and running in minutes</h2>
          <p className="mb-16 text-white/50">No technical knowledge required</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Connect WhatsApp", desc: "Scan the QR code with your WhatsApp — instant connection, no API keys needed." },
              { step: "02", title: "Configure AI", desc: "Set your business context and let our AI handle incoming messages automatically." },
              { step: "03", title: "Grow & Automate", desc: "Watch orders get created, campaigns sent, and customers supported — 24/7 on autopilot." },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-4 text-6xl font-black text-white/5">{s.step}</div>
                <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-white/50">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Our AI Chatbot Works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400">
              <Bot className="h-3.5 w-3.5" />
              AI-Powered Conversations
            </div>
            <h2 className="mb-4 text-4xl font-bold">How Our AI Chatbot Works</h2>
            <p className="text-white/50">From customer message to smart reply — in seconds</p>
          </div>

          <div className="relative grid gap-6 sm:grid-cols-3">
            {/* Connector lines */}
            <div className="absolute top-16 left-1/3 right-1/3 hidden h-0.5 bg-gradient-to-r from-[#25D366]/40 via-violet-500/40 to-[#25D366]/40 sm:block" />

            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] font-bold text-lg border border-[#25D366]/30">1</div>
              <div className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#25D366]">Client Sends Message</p>
                {/* Chat bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm text-white/80 text-left">
                    Hi, I want to order the blue sneakers in size 42 🛍️
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/40">Customer initiates via WhatsApp, Facebook, or Instagram</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold text-lg border border-violet-500/30">2</div>
              <div className="mb-4 w-full rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-400">AI Processing</p>
                <div className="space-y-2">
                  {[
                    { label: "Meta Business API", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
                    { label: "AI Engine", color: "bg-violet-500/20 text-violet-400 border-violet-500/20" },
                    { label: "NLP Processing", color: "bg-orange-500/20 text-orange-400 border-orange-500/20" },
                  ].map((b) => (
                    <div key={b.label} className={`rounded-lg border px-3 py-2 text-xs font-medium ${b.color}`}>
                      {b.label}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-white/40">Message analyzed, intent detected, context retrieved</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] font-bold text-lg border border-[#25D366]/30">3</div>
              <div className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#25D366]">Smart AI Reply</p>
                {/* Reply bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#25D366]/20 px-4 py-3 text-sm text-white/80 text-left border border-[#25D366]/20">
                    Great! Here are the details for the blue sneakers (size 42): $59.99 — shall I confirm your order? ✅
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/40">Personalized response sent instantly, order optionally created</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-white/50">
              Average response time <span className="font-semibold text-white/80">&lt; 3 seconds</span> · Works 24/7 with no human intervention · Supports <span className="font-semibold text-white/80">any language</span>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 text-center">
            <h2 className="mb-4 text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="text-white/50">14-day free trial on all plans. Cancel anytime.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-6 ${plan.popular ? "border-[#25D366] bg-[#25D366]/5 shadow-lg shadow-[#25D366]/10" : "border-white/10 bg-white/5"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className="text-white/40">/mo</span>
                </div>
                <ul className="mb-8 space-y-3 text-sm text-white/60">
                  {[
                    `${plan.profiles} WhatsApp profile${plan.profiles > 1 ? "s" : ""}`,
                    `${plan.team} team member${plan.team !== 1 ? "s" : ""}`,
                    `${plan.campaigns.toLocaleString()} campaign msgs`,
                    `${plan.confirmations.toLocaleString()} confirmations`,
                    `${plan.tokens} AI tokens`,
                    `${plan.storage} storage`,
                    "AI chatbot included",
                    "E-commerce integrations",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-[#25D366]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${plan.popular ? "bg-[#25D366] text-white hover:bg-[#128C7E]" : "border border-white/20 text-white/70 hover:border-white/40 hover:text-white"}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-10 text-3xl font-bold">Connects with your stack</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map((name) => (
              <div key={name} className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold">Loved by businesses</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { name: "Ahmed K.", role: "E-commerce store owner", text: "We went from answering 200+ WhatsApp messages a day manually to having the AI handle 90% of them. Orders are up 40%." },
              { name: "Sara M.", role: "Customer support lead", text: "The campaign feature alone paid for the subscription in the first week. Sent a promo to 2,000 contacts in minutes." },
              { name: "Carlos R.", role: "Dropshipper", text: "AI extracts order details from chat and creates orders automatically. My fulfilment team loves it." },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 flex text-[#25D366]">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mb-4 text-sm text-white/60 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-white/40">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-4xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-2 font-semibold">{faq.q}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-3xl border border-[#25D366]/20 bg-[#25D366]/5 p-12">
            <h2 className="mb-4 text-4xl font-bold">Ready to automate?</h2>
            <p className="mb-8 text-white/50">Start your 14-day free trial. No credit card required.</p>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-10 py-4 text-base font-semibold text-white hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/25">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-6 flex items-center justify-center gap-4 text-xs text-white/30">
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure & private</span>
              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Multi-language AI</span>
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> &lt;10s response time</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Top: brand + columns */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">Tijara AI</span>
              </div>
              <p className="text-sm text-white/45 leading-relaxed max-w-xs">
                Automatisez votre WhatsApp business avec l&apos;IA. Idéal pour les marchands e-commerce au Maroc.
              </p>
              <div className="mt-5 flex gap-3 text-xs text-white/30">
                <span className="rounded-full border border-white/10 px-3 py-1">YouCan</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Shopify</span>
                <span className="rounded-full border border-white/10 px-3 py-1">WooCommerce</span>
              </div>
            </div>

            {/* Produit */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Produit</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-white/65 hover:text-[#25D366] transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="text-white/65 hover:text-[#25D366] transition-colors">Tarifs</a></li>
                <li><a href="#faq" className="text-white/65 hover:text-[#25D366] transition-colors">FAQ</a></li>
                <li><Link href="/login" className="text-white/65 hover:text-[#25D366] transition-colors">Connexion</Link></li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Entreprise</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="text-white/65 hover:text-[#25D366] transition-colors">À propos</Link></li>
                <li><Link href="/contact" className="text-white/65 hover:text-[#25D366] transition-colors">Contact</Link></li>
                <li><Link href="/contact" className="text-white/65 hover:text-[#25D366] transition-colors">Support</Link></li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Légal</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="text-white/65 hover:text-[#25D366] transition-colors">Confidentialité</Link></li>
                <li><Link href="/terms" className="text-white/65 hover:text-[#25D366] transition-colors">Conditions d&apos;utilisation</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-white/10 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/25">© 2025 Tijara AI. Tous droits réservés.</p>
            <p className="text-xs text-white/20">Plateforme d&apos;automatisation WhatsApp · IA intégrée · Maroc</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
