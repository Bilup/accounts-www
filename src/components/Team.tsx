import { useInView } from "../hooks/useInView";
import { UserAvatar } from "./UserAvatar";
import s from "./Team.module.css";

interface TeamMember {
  name: string;
  role: string;
  pfp: string;
  username?: string;
  socials: {
    main: { link: string; name: string };
    alts: { link: string; icon: string; name: string }[];
  };
}

export function Team({ data }: { data: TeamMember[] | null }) {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} class={s.team}>
      <div class={s.bgOrb} />
      <div class={s.inner}>
        <div class={`${s.header} ${inView ? s.fadeUp : s.hidden}`}>
          <h2 class={s.heading}>The people behind Rotur</h2>
        </div>
        <div class={s.grid}>
          {data?.map((member) => (
            <div key={member.name} class={s.card}>
              <UserAvatar
                username={member.username || member.name}
                pfp={member.pfp}
                className={s.avatar}
              />
              <h3 class={s.name}>{member.name}</h3>
              <p class={s.role}>{member.role}</p>
              <div class={s.socials}>
                <a
                  href={member.socials.main.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={s.socialBtn}
                >
                  {member.socials.main.name}
                </a>
                {member.socials.alts.map((alt) => (
                  <a
                    key={alt.name}
                    href={alt.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={s.socialIcon}
                    title={alt.name}
                  >
                    <img
                      src={alt.icon}
                      alt={alt.name}
                      class={s.socialIconImg}
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
