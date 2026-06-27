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
  Palette,
  GitBranch,
} from "lucide-preact";
import type { LucideProps } from "lucide-preact";
import type React from "preact/compat";

type Category = "Apps" | "Social" | "Fun";

const CATEGORY_ORDER: Category[] = ["Apps", "Social", "Fun"];

interface Service {
  name: string;
  desc: string;
  href: string;
  label: string;
  icon: React.FC<LucideProps>;
  category: Category;
  wip?: boolean;
}

const services: Service[] = [
  {
    name: "roturPhotos",
    desc: "A simple Google Photos alternative for storing and managing your photos with privacy in mind.",
    href: "https://photos.rotur.dev",
    label: "photos.rotur.dev",
    icon: Image,
    category: "Apps",
  },
  {
    name: "roturGate",
    desc: "An easy-to-use link shortener that makes sharing long URLs simple and clean.",
    href: "https://gate.rotur.dev",
    label: "gate.rotur.dev",
    icon: Link2,
    category: "Apps",
  },
  {
    name: "roturNotes",
    desc: "A personal cloud notes app with tags and search functionality.",
    href: "https://notes.rotur.dev",
    label: "notes.rotur.dev",
    icon: NotebookPen,
    category: "Apps",
  },
  {
    name: "roturMail",
    desc: "Internet messaging for your Rotur account, our own internet message format - not email.",
    href: "https://mail.rotur.dev",
    label: "mail.rotur.dev",
    icon: Mail,
    category: "Apps",
  },
  {
    name: "roturBeam",
    desc: "A peer-to-peer file transfer service for secure and direct file sharing.",
    href: "https://beam.rotur.dev",
    label: "beam.rotur.dev",
    icon: Zap,
    category: "Apps",
  },
  {
    name: "roturEmbed",
    desc: "Drop-in identity widgets for any website: rotur-authenticated comments, reactions, polls, profiles and tipping with just a tag.",
    href: "https://embed.rotur.dev",
    label: "embed.rotur.dev",
    icon: Blocks,
    category: "Apps",
  },
  {
    name: "roturGIT",
    desc: "A Rotur-integrated GitHub alternative for hosting your code, managing repositories, and collaborating.",
    href: "https://git.rotur.dev",
    label: "git.rotur.dev",
    icon: GitBranch,
    category: "Apps",
  },
  {
    name: "userLookup",
    desc: "Search and view any public Rotur user profile, including their bio, stats, and activity.",
    href: "/profile",
    label: "Look up a user",
    icon: UserSearch,
    category: "Apps",
  },
  {
    name: "roturAuthenticator",
    desc: "A secure TOTP authenticator with local encryption and instant cloud syncing.",
    href: "https://authenticator.rotur.dev",
    label: "authenticator.rotur.dev",
    icon: ShieldCheck,
    category: "Apps",
  },
  {
    name: "originChats",
    desc: "A self-hostable Discord alternative for secure and private communication.",
    href: "https://originchats.com",
    label: "originchats.com",
    icon: MessageCircle,
    category: "Social",
  },
  {
    name: "pounce",
    desc: "Rotur's official client for claw, the social media platform built into most Rotur clients.",
    href: "https://pounce.rotur.dev",
    label: "pounce.rotur.dev",
    icon: PawPrint,
    category: "Social",
  },
  {
    name: "roturPlace",
    desc: "A collaborative pixel canvas in the spirit of r/place, claim pixels, team up, and paint the board together.",
    href: "https://place.rotur.dev",
    label: "place.rotur.dev",
    icon: Palette,
    category: "Fun",
  },
];

function ServiceCard({ svc }: { svc: Service }) {
  return (
    <div class={s.card}>
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
  );
}

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
          {CATEGORY_ORDER.map((category) => {
            const items = services.filter((svc) => svc.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} class={s.category}>
                <h2 class={s.categoryTitle}>{category}</h2>
                <div class={s.grid}>
                  {items.map((svc) => (
                    <ServiceCard key={svc.name} svc={svc} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
