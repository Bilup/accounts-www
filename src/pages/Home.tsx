import { useState, useEffect } from "preact/hooks";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Features } from "../components/Features";
import { Team } from "../components/Team";
import { Contributors } from "../components/Contributors";
import { CTA } from "../components/CTA";
import { Footer } from "../components/Footer";
import { features } from "../../public/config/features";

interface TeamMember {
  name: string;
  role: string;
  pfp: string;
  socials: {
    main: { link: string; name: string };
    alts: { link: string; icon: string; name: string }[];
  };
}

interface Contributor {
  name: string;
  pfp: string;
  link: string;
}

export function Home() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [contributors, setContributors] = useState<Contributor[] | null>(null);

  useEffect(() => {
    fetch("/config/rotur-team.json")
      .then((r) => r.json())
      .then(setTeam)
      .catch(console.error);
    fetch("/config/contributors.json")
      .then((r) => r.json())
      .then(setContributors)
      .catch(console.error);
  }, []);

  return (
    <div style="min-height:100vh;background-color:var(--void)">
      <Header />
      <main>
        <Hero />
        <About />
        <Features data={features} />
        <Team data={team} />
        <Contributors data={contributors} />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
