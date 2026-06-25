import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useInView } from "../hooks/useInView";
import s from "./Services.module.css";
import {
  MoveUpRight,
  Image,
  Link2,
  NotebookPen,
  MessageCircle,
  Zap,
  PawPrint,
  UserSearch,
  ShieldCheck,
  Mail,
  Blocks,
} from "lucide-preact";
import type { LucideProps } from "lucide-preact";
import type React from "preact/compat";

interface Service {
  name: string;
  desc: string;
  href: string;
  label: string;
  icon: React.FC<LucideProps>;
  wip?: boolean;
}

const services: Service[] = [
  {
    name: "roturPhotos",
    desc: "A simple Google Photos alternative for storing and managing your photos with privacy in mind.",
    href: "https://photos.rotur.dev",
    label: "photos.rotur.dev",
    icon: Image,
  },
  {
    name: "roturGate",
    desc: "An easy-to-use link shortener that makes sharing long URLs simple and clean.",
    href: "https://gate.rotur.dev",
    label: "gate.rotur.dev",
    icon: Link2,
  },
  {
    name: "roturNotes",
    desc: "A personal cloud notes app with tags and search functionality.",
    href: "https://notes.rotur.dev",
    label: "notes.rotur.dev",
    icon: NotebookPen,
  },
  {
    name: "roturMail",
    desc: "A private email client for your Rotur account, built to keep your inbox clean and secure.",
    href: "https://mail.rotur.dev",
    label: "mail.rotur.dev",
    icon: Mail,
  },
  {
    name: "originChats",
    desc: "A self-hostable Discord alternative for secure and private communication.",
    href: "https://originchats.com",
    label: "originchats.com",
    icon: MessageCircle,
  },
  {
    name: "roturBeam",
    desc: "A peer-to-peer file transfer service for secure and direct file sharing.",
    href: "https://beam.rotur.dev",
    label: "beam.rotur.dev",
    icon: Zap,
  },
  {
    name: "roturEmbed",
    desc: "Drop-in identity widgets for any website: rotur-authenticated comments, reactions, polls, profiles and tipping with just a tag.",
    href: "https://embed.rotur.dev",
    label: "embed.rotur.dev",
    icon: Blocks,
  },
  {
    name: "pounce",
    desc: "Rotur's official client for claw, the social media platform built into most Rotur clients.",
    href: "https://pounce.rotur.dev",
    label: "pounce.rotur.dev",
    icon: PawPrint,
  },
  {
    name: "userLookup",
    desc: "Search and view any public Rotur user profile, including their bio, stats, and activity.",
    href: "/profile",
    label: "Look up a user",
    icon: UserSearch,
  },
  {
    name: "roturAuthenticator",
    desc: "A secure TOTP authenticator with local encryption and instant cloud syncing.",
    href: "https://authenticator.rotur.dev",
    label: "authenticator.rotur.dev",
    icon: ShieldCheck,
  },
];

export function Services() {
  const { ref, inView } = useInView();

  return (
    <div class={s.page}>
      <Header />
      <section ref={ref} class={s.section}>
        <div class={s.bgOrb} />
        <div class={s.inner}>
          <div class={`${s.header} ${inView ? s.fadeUp : s.hidden}`}>
            <h1 class={s.heading}>Rotur Services</h1>
            <p class={s.sub}>
              Discover all the services and applications that make up the Rotur
              ecosystem. Each one is designed to work seamlessly with your Rotur
              account.
            </p>
          </div>
          <div class={s.grid}>
            {services.map((svc) => (
              <div key={svc.name} class={s.card}>
                <div class={s.iconBox}>
                  <svc.icon class={s.icon} />
                </div>
                <div class={s.body}>
                  <h3 class={s.cardTitle}>{svc.name}</h3>
                  <p class={s.cardDesc}>{svc.desc}</p>
                </div>
                {svc.wip ? (
                  <span class={s.badge}>Work in Progress</span>
                ) : (
                  svc.href && (
                    <a
                      href={svc.href}
                      target={svc.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      class={s.link}
                    >
                      {svc.label}
                      <MoveUpRight size={14} />
                    </a>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
