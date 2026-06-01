import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import s from "./Services.module.css";
import { MoveUpRight } from "lucide-preact";

const services = [
  {
    name: "roturPhotos",
    desc: "A simple Google Photos alternative for storing and managing your photos with privacy in mind.",
    href: "https://photos.rotur.dev",
    label: "photos.rotur.dev",
  },
  {
    name: "roturGate",
    desc: "An easy-to-use link shortener that makes sharing long URLs simple and clean.",
    href: "https://gate.rotur.dev",
    label: "gate.rotur.dev",
  },
  {
    name: "roturNotes",
    desc: "A personal cloud notes app with tags and search functionality.",
    href: "https://notes.rotur.dev",
    label: "notes.rotur.dev",
  },
  {
    name: "originChats",
    desc: "A self-hostable Discord alternative for secure and private communication.",
    href: "https://originchats.mistium.com",
    label: "originchats.mistium.com",
  },
  {
    name: "roturBeam",
    desc: "A peer-to-peer file transfer service for secure and direct file sharing.",
    href: "",
    label: "",
    wip: true,
  },
  {
    name: "claw",
    desc: "A basic social media platform accessible from most Rotur clients, especially originOS.",
    href: "#",
    label: "Available in Rotur clients",
  },
  {
    name: "userLookup",
    desc: "Search and view any public Rotur user profile, including their bio, stats, and activity.",
    href: "/profile",
    label: "Look up a user",
  },
  {
    name: "roturAuthenticator",
    desc: "A secure TOTP authenticator with local encryption and instant cloud syncing.",
    href: "https://authenticator.rotur.dev",
    label: "authenticator.rotur.dev",
  },
];

export function Services() {
  return (
    <div class={s.page}>
      <Header />
      <div class={s.wrapper}>
        <h1 class={s.title}>Rotur Services</h1>
        <div class={s.rule} />
        <p class={s.sub}>
          Discover all the services and applications that make up the Rotur
          ecosystem. Each service is designed to work seamlessly with your Rotur
          account.
        </p>
        <div class={s.grid}>
          {services.map((svc) => (
            <div key={svc.name} class={s.card}>
              <div>
                <h3 class={s.cardTitle}>{svc.name}</h3>
                <p class={s.cardDesc}>{svc.desc}</p>
              </div>
              {svc.wip ? (
                <span class={s.badge}>Work in Progress</span>
              ) : (
                svc.href && (
                  <a
                    href={svc.href}
                    target="_blank"
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
        <p class={s.footerNote}>
          All services are designed to work together seamlessly with your Rotur
          account. Stay tuned for more services coming soon!
        </p>
      </div>
      <Footer />
    </div>
  );
}
