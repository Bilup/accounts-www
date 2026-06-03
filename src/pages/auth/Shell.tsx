import s from "./Shell.module.css";

export function AuthShell({ children }: { children: any }) {
  return (
    <div class={s.shell}>
      <div class={s.modal}>
        <div class={s.modalContent}>{children}</div>
      </div>
    </div>
  );
}

export function AuthSidebar({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: any;
  footer?: any;
}) {
  return (
    <div class={s.sidebar}>
      <div class={s.sidebarHeader}>
        <h2 class={s.sidebarTitle}>{title}</h2>
        <p class={s.sidebarSubtitle}>{subtitle}</p>
      </div>
      <div class={s.sidebarBody}>{children}</div>
      {footer && <div class={s.sidebarFooter}>{footer}</div>}
    </div>
  );
}

export function AuthMain({ children }: { children: any }) {
  return <div class={s.main}>{children}</div>;
}

export function AuthLogo() {
  return (
    <div class={s.logo}>
      <img src="/Rotur Logo.png" alt="Rotur" draggable={false} />
    </div>
  );
}

export function AuthHeading({ children }: { children: any }) {
  return <h1 class={s.heading}>{children}</h1>;
}

export function AuthSubheading({ children }: { children: any }) {
  return <p class={s.subheading}>{children}</p>;
}

export function AuthFormGroup({ children }: { children: any }) {
  return <div class={s.formGroup}>{children}</div>;
}

export function AuthInput(props: any) {
  const { ref, ...rest } = props;
  return <input ref={ref} class={s.input} {...rest} />;
}

export function AuthBtnPrimary({
  children,
  disabled,
  style,
  ...rest
}: {
  children?: any;
  disabled?: boolean;
  style?: any;
  [key: string]: any;
}) {
  return (
    <button class={s.btnPrimary} disabled={disabled} style={style} {...rest}>
      {children}
    </button>
  );
}

export function AuthBtnSecondary({
  children,
  ...rest
}: {
  children: any;
  [key: string]: any;
}) {
  return (
    <button class={s.btnSecondary} {...rest}>
      {children}
    </button>
  );
}

export function AuthNotice({
  variant,
  icon,
  title,
  children,
}: {
  variant: "warning" | "info" | "error" | "success";
  icon: string;
  title?: string;
  children: any;
}) {
  const cls =
    variant === "warning"
      ? s.noticeWarning
      : variant === "info"
        ? s.noticeInfo
        : variant === "error"
          ? s.noticeError
          : s.noticeSuccess;

  return (
    <div class={`${s.notice} ${cls}`}>
      <i class={`${icon} ${s.noticeIcon}`} />
      <div>
        {title && <strong class={s.noticeTitle}>{title}</strong>}
        <p class={s.noticeText}>{children}</p>
      </div>
    </div>
  );
}

export function AuthTosLinks({ children }: { children: any }) {
  return <div class={s.tosLinks}>{children}</div>;
}

export function AuthTosLinkBtn({
  children,
  ...rest
}: {
  children: any;
  [key: string]: any;
}) {
  return (
    <button class={s.tosLinkBtn} {...rest}>
      {children}
    </button>
  );
}

export function AuthSidebarAction({
  children,
  ...rest
}: {
  children: any;
  [key: string]: any;
}) {
  return (
    <button class={s.sidebarAction} {...rest}>
      {children}
    </button>
  );
}
