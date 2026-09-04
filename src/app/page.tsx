import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Package,
  Search,
  Users,
  BarChart3,
  Truck,
  CheckCircle2,
  ArrowRight,
  Layers,
  Zap,
  Shield,
} from "lucide-react";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Touchline</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="btn-ghost text-sm"
            >
              Sign in
            </Link>
            <Link href="/login" className="btn-primary text-sm">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" />
              Built for signage & branding teams
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Manage materials{" "}
              <span className="bg-gradient-to-r from-primary to-brand-400 bg-clip-text text-transparent">
                from source
              </span>{" "}
              to delivery
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Track sourcing tasks, manage inventory, coordinate vendors, and deliver
              branded materials — all from one platform built for how your team actually
              works.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/login" className="btn-primary h-12 px-8 text-base">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#features" className="btn-ghost h-12 px-8 text-base">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / Social proof strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">
            Trusted by teams managing complex material workflows
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-12 opacity-40">
            {["Touchline", "BrandsCo", "SignPro", "PrintHub", "MediaFlow"].map((name) => (
              <span key={name} className="text-sm font-semibold tracking-wide text-foreground">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your team needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform to source, brand, track, and deliver. No more spreadsheets,
            sticky notes, or lost WhatsApp messages.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Task Pipeline",
              description:
                "12-stage workflow from sourcing to distribution. Every task tracked, nothing falls through the cracks.",
            },
            {
              icon: Package,
              title: "Material Catalogue",
              description:
                "Inventory with stock levels, reorder alerts, and supplier links. Know exactly what you have.",
            },
            {
              icon: Truck,
              title: "Vendor Network",
              description:
                "Sourcing and branding partners in one directory. Track pricing, lead times, and reliability.",
            },
            {
              icon: Users,
              title: "Team Management",
              description:
                "Invite-only access with Admin, Manager, and Employee roles. Everyone sees what they need.",
            },
            {
              icon: Search,
              title: "Photo Tracking",
              description:
                "Upload samples, artwork, proofs, and delivery photos. Full visual documentation trail.",
            },
            {
              icon: BarChart3,
              title: "Dashboard Insights",
              description:
                "Real-time KPIs, low stock alerts, stalled task warnings. Make decisions, not guesses.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No complex setup. No training required. Just sign in and go.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Sign in",
                description: "Google OAuth — one click, no passwords to remember.",
              },
              {
                step: "2",
                title: "Add your team",
                description: "Invite managers and field staff by email. They join in seconds.",
              },
              {
                step: "3",
                title: "Set up catalogue",
                description: "Add materials, vendors, and pricing. Or import from a spreadsheet.",
              },
              {
                step: "4",
                title: "Start sourcing",
                description: "Create tasks, assign to team, and track through the full pipeline.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-lg">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                {i < 3 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-6 hidden h-px w-[calc(100%-5rem)] bg-border lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for your workflow
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're sourcing branded merchandise, coordinating event materials,
            or managing government tenders.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Corporate Branding",
              description:
                "Manage company merchandise, branded apparel, and promotional materials at scale.",
            },
            {
              icon: Zap,
              title: "Event Management",
              description:
                "Coordinate materials for conferences, exhibitions, and special events across venues.",
            },
            {
              icon: BarChart3,
              title: "Government Tenders",
              description:
                "Track large-scale procurement with multiple vendors, recipients, and compliance requirements.",
            },
          ].map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-xl border bg-card p-8 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <useCase.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{useCase.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to streamline your workflow?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start managing your materials and team more efficiently today. Free for small
              teams.
            </p>
            <div className="mt-8">
              <Link href="/login" className="btn-primary h-12 px-8 text-base">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Package className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">Touchline Inventory</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Touchline. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
