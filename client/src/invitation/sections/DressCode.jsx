import { Reveal, SectionTitle } from "./util.jsx";

export default function DressCodeSection({ cfg }) {
  const items = cfg.dress_code || [];
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Dress Code" title="Código de Vestimenta" />
        <div className="flex flex-wrap justify-center gap-4">
          {items.map((item, i) => (
            <Reveal key={i} delay={(i % 3) + 1}>
              <div className="flex items-center gap-3 rounded-2xl border border-inv-primary/30 bg-inv-surface px-6 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-inv-primary/50">
                <DressIcon name={item.icon} />
                <span className="font-inv-heading text-lg text-inv-text-soft">{item.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
        {cfg.dress_note && (
          <Reveal className="mt-8 text-center text-inv-text-soft font-light italic">
            {cfg.dress_note}
          </Reveal>
        )}
      </div>
    </section>
  );
}

function DressIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    className: "w-8 h-8 text-inv-primary",
  };
  switch (name) {
    case "tie":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M9 3h6l2 4-4 4 2 8-3 2-3-2 2-8-4-4z" strokeLinejoin="round" />
        </svg>
      );
    case "gown":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path
            d="M12 3c2 0 3 1 3 3 0 1-1 2-3 4s-3-3-3-4c0-2 1-3 3-3z"
            strokeLinejoin="round"
          />
          <path d="M9 6l-4 6 5 9h4l5-9-4-6" strokeLinejoin="round" />
        </svg>
      );
    case "formal":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M6 3h5l-1 5h3l6-2v4l-8 12-8-12V6l4 2z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeLinejoin="round" />
        </svg>
      );
  }
}