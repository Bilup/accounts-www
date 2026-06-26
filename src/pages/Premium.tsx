import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import s from "./Premium.module.css";

const plans = [
  {
    name: "Free",
    desc: "Essential features to get started",
    price: "£0",
    period: "forever",
    features: [
      "5MB storage",
      "100 rmail messages",
      "Basic customization",
      "200 char bio",
      "1x daily credit multiplier",
    ],
    href: "",
  },
  {
    name: "Drive",
    desc: "Everything you need for serious use",
    price: "£3",
    period: "/month",
    features: [
      "150MB storage",
      "File sharing access",
      "1,000 rmail messages",
      "Animated profiles",
      "2x daily credits",
      "500 char bio limit",
      "100MB roturPhotos storage",
    ],
    href: "https://ko-fi.com/mistium",
    featured: true,
  },
  {
    name: "Pro",
    desc: "Unlock all of rotur's features",
    price: "£5",
    period: "/month",
    features: [
      "1GB storage",
      "Custom email address",
      "100k rmail messages",
      "Pro badge",
      "3x daily credits",
      "1,000 char bio limit",
      "1GB roturPhotos storage",
    ],
    href: "https://ko-fi.com/mistium",
  },
];

export function Premium() {
  return (
    <div class={s.page}>
      <Header />
      <div class={s.wrapper}>
        <div class={s.hero}>
          <h1>rotur Premium</h1>
          <p>
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>
        <div class={s.grid}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              class={`${s.card} ${plan.featured ? s.featured : ""}`}
            >
              {plan.featured && <span class={s.badge}>Most Popular</span>}
              <div class={s.tierName}>{plan.name}</div>
              <div class={s.tierDesc}>{plan.desc}</div>
              <div class={s.price}>{plan.price}</div>
              <div class={s.pricePeriod}>{plan.period}</div>
              <div class={s.features}>
                <h3>
                  {plan.name === "Free"
                    ? "What's Included"
                    : `Everything in Free, plus`}
                </h3>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              {plan.href ? (
                <a
                  href={plan.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={s.ctaBtn}
                >
                  Get Started
                </a>
              ) : (
                <button class={s.ctaBtn} disabled>
                  Current Plan
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
