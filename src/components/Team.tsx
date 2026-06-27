import { useInView } from "../hooks/useInView";
import { UserAvatar } from "./UserAvatar";
import s from "./Team.module.css";

interface TeamMember {
  name: string;
  role: string;
  pfp: string;
  username?: string;
  bio?: string;
  socials: {
    main: { link: string; name: string };
    alts: { link: string; icon: string; name: string }[];
  };
}

interface TeamData {
  lead: TeamMember;
  partner?: TeamMember;
  tiers: { label: string; compact?: boolean; members: TeamMember[] }[];
}

function prettyBio(bio: string) {
  // Highlight product names so the founder blurb reads nicely.
  const parts = bio.split(/(Rotur|OriginChats)/g);
  return parts.map((part, i) =>
    part === "Rotur" || part === "OriginChats" ? (
      <span key={i} class={s.accent}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function Socials({ member }: { member: TeamMember }) {
  return (
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
          <img src={alt.icon} alt={alt.name} class={s.socialIconImg} />
        </a>
      ))}
    </div>
  );
}

function MemberCard({
  member,
  compact,
}: {
  member: TeamMember;
  compact?: boolean;
}) {
  return (
    <div class={`${s.card} ${compact ? s.cardCompact : ""}`}>
      <UserAvatar
        username={member.username || member.name}
        pfp={member.pfp}
        className={s.avatar}
      />
      <h3 class={s.name}>{member.name}</h3>
      <p class={s.role}>{member.role}</p>
      <Socials member={member} />
    </div>
  );
}

export function Team({ data }: { data: TeamData | null }) {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} class={s.team}>
      <div class={s.inner}>
        <div class={`${s.header} ${inView ? s.fadeUp : s.hidden}`}>
          <h2 class={s.heading}>The people behind Rotur</h2>
        </div>

        {data && (
          <div class={s.stack}>
            <div class={s.founderRow}>
              <div class={s.leadCard}>
                <UserAvatar
                  username={data.lead.username || data.lead.name}
                  pfp={data.lead.pfp}
                  className={s.leadAvatar}
                />
                <div class={s.leadBody}>
                  <h3 class={s.leadName}>{data.lead.name}</h3>
                  <p class={s.leadRole}>{data.lead.role}</p>
                  {data.lead.bio && (
                  <p class={s.leadBio}>{prettyBio(data.lead.bio)}</p>
                )}
                  <Socials member={data.lead} />
                </div>
              </div>

              {data.partner && (
                <div class={s.partnerCard}>
                  <UserAvatar
                    username={data.partner.username || data.partner.name}
                    pfp={data.partner.pfp}
                    className={s.partnerAvatar}
                  />
                  <h3 class={s.name}>{data.partner.name}</h3>
                  <p class={s.partnerRole}>{data.partner.role}</p>
                  <Socials member={data.partner} />
                </div>
              )}
            </div>

            {data.tiers.map((tier) => (
              <div key={tier.label} class={s.tier}>
                <div class={s.tierLabel}>
                  <span>{tier.label}</span>
                </div>
                <div class={`${s.grid} ${tier.compact ? s.gridCompact : ""}`}>
                  {tier.members.map((member) => (
                    <MemberCard
                      key={member.name}
                      member={member}
                      compact={tier.compact}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
