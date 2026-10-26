import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, Check, Cpu, Globe, HardDrive, KeyRound, Loader2, MemoryStick, Monitor, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import heroImage from "@/assets/windows-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "TempDesk — Your free Windows cloud desktop" },
    { name: "description", content: "Your own Windows RDP machine, free for 30 days. Get 4 vCPU, 8 GiB RAM, 300 GB storage and real remote desktop credentials." },
    { property: "og:title", content: "TempDesk — Your free Windows cloud desktop" },
    { property: "og:description", content: "A Windows machine of your own. 4 vCPU, 8 GiB RAM, 300 GB storage. Free for 30 days." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const specs = [
  { icon: Cpu, value: "4 vCPU", label: "Virtual processing power" },
  { icon: MemoryStick, value: "8 GiB RAM", label: "Space to multitask" },
  { icon: HardDrive, value: "300 GB", label: "Storage for your projects" },
  { icon: CalendarDays, value: "30 days", label: "Uninterrupted access" },
];
const faqs = [
  { q: "Is my Windows machine really free?", a: "Yes. The TempDesk Windows plan is free for 30 days. Each signed-in user can claim one machine, subject to availability." },
  { q: "How do I connect to my desktop?", a: "After you claim a machine, your machine page shows its real IP address, RDP port, username and password. Enter those details in Remote Desktop Connection on Windows, Windows App on Mac, or an RDP client on your phone." },
  { q: "What is included with my machine?", a: "You get a Windows RDP machine with 4 vCPU, 8 GiB RAM and 300 GB storage. The machine stays assigned to you for 30 days, so you can return to your projects throughout that period." },
  { q: "Can I use it to test my applications?", a: "Yes. Use your Windows environment to run applications, test your projects and work remotely. Keep a separate backup of anything important before your access expires." },
  { q: "What happens when the 30 days end?", a: "Your access expires and the machine is no longer assigned to you. Save your files elsewhere before the end of your session. You can also release your machine early from your machine page." },
  { q: "What if no machines are available?", a: "Machines are allocated from the available pool. If all machines are in use, check back later. The availability indicator shows how many machines are currently free." },
];

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ available: number; total: number } | null>(null);
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    supabase.rpc("count_available_desktops").then(({ data }) => {
      const row = (data as { available: number; total: number }[] | null)?.[0];
      if (row) setStats({ available: Number(row.available), total: Number(row.total) });
    });
  }, []);
  const launch = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    setClaiming(true);
    const { error } = await supabase.rpc("claim_rdp_desktop");
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/desktop" });
  };
  const claimDisabled = claiming || (stats?.available === 0 && !!user);
  const claimLabel = user ? "Claim my machine" : "Get started free";

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="relative isolate overflow-hidden bg-hero">
          <img src={heroImage} alt="Windows desktop on a silver laptop beside a purple cloud" width={1536} height={1024} fetchPriority="high" className="hero-image absolute inset-0 -z-10 h-full w-full object-cover max-md:opacity-20" />
          <div className="mx-auto max-w-6xl px-5 py-7 md:py-20 lg:px-8 lg:py-24">
            <div className="max-w-xl md:max-w-[48%]">
              <p className="mb-5 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-normal text-primary"><span className="h-2 w-2 rounded-full bg-success" />YOUR WORKSPACE. ZERO COST.</p>
              <h1 className="text-4xl font-extrabold leading-[1.12] md:text-5xl lg:text-6xl">Your Windows<br />cloud desktop.<br /><span className="text-primary">Free for 30 days.</span></h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">A little more freedom to build, test and explore. Get a Windows machine of your own, without buying one.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {["4 vCPU, 8 GiB RAM & 300 GB storage", "Real IP address and private login", "Yours around the clock for 30 days"].map(t => <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{t}</li>)}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={launch} disabled={claimDisabled}>{claiming ? <Loader2 className="animate-spin" /> : null}{claimLabel}<ArrowRight /></Button>
                <span className="font-mono text-sm"><span className="text-3xl font-medium">$0</span> / 30 days</span>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />{!loading && user ? "One machine per account · subject to availability" : "Free account · no credit card needed"}</p>
              {user && <Button asChild variant="link" className="mt-2 px-0"><Link to="/desktop">Open my machine <ArrowRight /></Link></Button>}
            </div>
          </div>
        </section>

        <section className="border-b bg-background">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-7 px-5 py-9 md:grid-cols-4 lg:px-8">
            {specs.map(({ icon: Icon, value, label }) => <div key={value} className="flex items-center gap-3 md:justify-center"><Icon className="h-6 w-6 shrink-0 text-primary" /><div><p className="font-mono text-lg font-medium">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div></div>)}
          </div>
        </section>

        <section id="plan" className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="text-center"><p className="font-mono text-xs text-primary">ONE SIMPLE PLAN</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">Big possibilities. No price tag.</h2><p className="mt-4 text-muted-foreground">Everything you need to make Windows your workspace.</p></div>
          <div className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-xl border border-primary/30 shadow-glow md:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-secondary p-7 md:p-9"><span className="inline-flex rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">FREE WINDOWS RDP</span><h3 className="mt-5 text-2xl font-bold">Your personal cloud PC</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A dedicated space for your next idea.</p><div className="mt-6 flex items-baseline gap-2"><span className="text-6xl font-extrabold">$0</span><span className="text-sm text-muted-foreground">/ 30 days</span></div><Button className="mt-6 w-full" size="lg" onClick={launch} disabled={claimDisabled}>{claiming ? <Loader2 className="animate-spin" /> : null}{claimLabel}<ArrowRight /></Button><p className="mt-4 text-center font-mono text-xs text-muted-foreground">{stats ? `${stats.available} of ${stats.total} machines available` : "Subject to machine availability"}</p></div>
            <div className="p-7 md:p-9"><h4 className="font-bold">All the essentials, included.</h4><ul className="mt-5 grid gap-4 text-sm">{["4 virtual CPU cores", "8 GiB RAM for smooth multitasking", "300 GB storage", "Windows operating system", "Real IP address & RDP access", "Your own username & password", "30 days of continuous access", "One machine per signed-in user"].map(t => <li key={t} className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-success" />{t}</li>)}</ul></div>
          </div>
        </section>

        <section id="features" className="bg-muted">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20"><p className="font-mono text-xs text-primary">ROOM TO DO MORE</p><h2 className="mt-3 max-w-xl text-3xl font-bold md:text-4xl">Less setup.<br />More getting things done.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
            { icon: Zap, title: "Power for your projects", text: "Run your apps, try new tools and test your ideas with 4 virtual cores and 8 GiB of memory." },
            { icon: Globe, title: "Your desktop, anywhere", text: "Connect from your laptop, Mac or phone with a Remote Desktop client. Same machine. Different place." },
            { icon: KeyRound, title: "A workspace of your own", text: "Your machine comes with its own IP address, username and password. Keep your login private and your projects close." },
          ].map(({icon: Icon, title, text}) => <div key={title}><span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-6 w-6" /></span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></div>)}</div></div>
        </section>

        <section className="bg-inverse text-inverse-foreground"><div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="font-mono text-xs text-inverse-foreground/60">FROM IDEA TO DESKTOP</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">Three steps. You're in.</h2></div><Button size="lg" onClick={launch} disabled={claimDisabled}>{claimLabel}<ArrowRight /></Button></div><div className="mt-12 grid gap-8 md:grid-cols-3">{[
          { n: "01", title: "Make it yours", text: "Sign in or create your free TempDesk account." },
          { n: "02", title: "Claim your machine", text: "Get an available Windows machine assigned to you for 30 days." },
          { n: "03", title: "Connect and create", text: "Use your IP and login details in your favorite RDP client." },
        ].map(s => <div key={s.n} className="border-t border-inverse-foreground/20 pt-6"><span className="font-mono text-sm text-inverse-foreground/50">{s.n}</span><h3 className="mt-4 text-xl font-bold">{s.title}</h3><p className="mt-3 max-w-xs text-sm leading-7 text-inverse-foreground/70">{s.text}</p></div>)}</div></div></section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-16 lg:py-20"><h2 className="text-center text-3xl font-bold md:text-4xl">A few things you might be wondering</h2><Accordion type="single" collapsible className="mt-10">{faqs.map((f, i) => <AccordionItem key={f.q} value={`faq-${i}`}><AccordionTrigger className="gap-5 py-6 text-base font-semibold hover:no-underline hover:text-primary">{f.q}</AccordionTrigger><AccordionContent className="pr-6 leading-7 text-muted-foreground">{f.a}</AccordionContent></AccordionItem>)}</Accordion></section>
      </main>
      <footer className="border-t bg-muted"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-10 lg:px-8"><div><Link to="/" className="flex items-center gap-2 text-xl font-extrabold"><Monitor className="h-6 w-6 text-primary" />TempDesk</Link><p className="mt-2 text-sm text-muted-foreground">Your next idea deserves a workspace.</p></div><div className="flex gap-6 text-sm text-muted-foreground"><a href="#plan" className="hover:text-primary">Windows RDP</a><a href="#faq" className="hover:text-primary">FAQ</a><Link to="/auth" className="hover:text-primary">Log in</Link></div></div><div className="mx-auto max-w-6xl border-t px-5 py-5 text-xs text-muted-foreground lg:px-8">TempDesk · Free Windows cloud desktops. Availability may vary.</div></footer>
    </div>
  );
}
