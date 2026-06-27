import type { ComponentChildren } from "preact";
import type { LucideProps } from "lucide-preact";
import type React from "preact/compat";
import { PageChrome } from "./PageChrome";
import s from "./AccountPage.module.css";

type IconComponent = React.FC<LucideProps>;

export interface AccountTab<T extends string> {
  id: T;
  label: string;
  icon: IconComponent;
  badge?: ComponentChildren;
}

export function AccountPage({
  title,
  subtitle,
  layoutClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  layoutClassName?: string;
  children: ComponentChildren;
}) {
  return (
    <PageChrome>
      <div class={s.page}>
        <div class={`${s.layout} ${layoutClassName ?? ""}`}>
          {title && <AccountPageHeader title={title} subtitle={subtitle} />}
          {children}
        </div>
      </div>
    </PageChrome>
  );
}

export function AccountPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ComponentChildren;
}) {
  return (
    <div class={s.pageHeader}>
      <div>
        <h1 class={s.pageTitle}>{title}</h1>
        {subtitle && <p class={s.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function AccountTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  actions,
}: {
  tabs: AccountTab<T>[];
  active: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
  actions?: ComponentChildren;
}) {
  return (
    <div class={s.tabsBar} role="tablist" aria-label={ariaLabel}>
      <div class={s.tabs}>
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            class={`${s.tab} ${active === id ? s.tabActive : ""}`}
            onClick={() => onChange(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
            {badge && <span class={s.tabBadge}>{badge}</span>}
          </button>
        ))}
      </div>
      {actions}
    </div>
  );
}

export function AccountTabPanel({ children }: { children: ComponentChildren }) {
  return (
    <div role="tabpanel" class={s.tabPanel}>
      {children}
    </div>
  );
}

export function AccountSection({
  icon,
  iconStyle,
  title,
  subtitle,
  actions,
  children,
}: {
  icon?: ComponentChildren;
  iconStyle?: Record<string, string | number>;
  title: string;
  subtitle?: ComponentChildren;
  actions?: ComponentChildren;
  children?: ComponentChildren;
}) {
  return (
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          {icon && (
            <div class={s.sectionIcon} style={iconStyle}>
              {icon}
            </div>
          )}
          <div>
            <h2 class={s.sectionTitle}>{title}</h2>
            {subtitle && <p class={s.sectionSubtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div class={s.sectionActions}>{actions}</div>}
      </div>
      {children && <div class={s.sectionBody}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon?: ComponentChildren;
  title: string;
  text?: ComponentChildren;
  children?: ComponentChildren;
}) {
  return (
    <div class={s.empty}>
      {icon && <div class={s.emptyIcon}>{icon}</div>}
      <div class={s.emptyTitle}>{title}</div>
      {text && <div class={s.emptyText}>{text}</div>}
      {children}
    </div>
  );
}

export function AuthRequired({
  icon,
  title,
  text,
  href,
  label = "Sign in",
}: {
  icon: ComponentChildren;
  title: string;
  text: string;
  href: string;
  label?: string;
}) {
  return (
    <AccountPage>
      <div class={s.authRequired}>
        <div class={s.authRequiredIcon}>{icon}</div>
        <div class={s.authRequiredTitle}>{title}</div>
        <p class={s.authRequiredText}>{text}</p>
        <a href={href} class={s.btnPrimary}>
          {label}
        </a>
      </div>
    </AccountPage>
  );
}
