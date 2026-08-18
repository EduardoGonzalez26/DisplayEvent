import { Reveal, SectionTitle } from "./util.jsx";

export default function LocationsSection({ cfg }) {
  const legacies = cfg.itinerary || [];
  const raw = cfg.locations || legacies.map((it) => it);
  const items = raw.map((it) => ({
    label: it.label,
    place: it.place,
    url: it.url || "",
    lat: it.lat,
    lng: it.lng,
  }));
  if (items.length === 0) return null;

  const googleMapsUrl = (it) => {
    if (it.url) return it.url;
    if (it.lat && it.lng)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${it.lat},${it.lng}`)}`;
    if (it.place)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`;
    return null;
  };
  const wazeUrl = (it) => {
    if (it.lat && it.lng)
      return `https://waze.com/ul?ll=${encodeURIComponent(`${it.lat},${it.lng}`)}&navigate=yes`;
    if (it.place)
      return `https://waze.com/ul?q=${encodeURIComponent(it.place)}&navigate=yes`;
    return null;
  };
  const googleUrl = (it) => googleMapsUrl(it);

  return (
    <section className="py-24 px-4 bg-inv-bg-alt2">
      <div className="max-w-5xl mx-auto">
        <SectionTitle
          eyebrow="Ubicaciones"
          title="Cómo Llegar"
          subtitle="Encuentra cada recinto de la celebración y navega directo con tu app favorita."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) + 1} className="h-full">
              <article className="group h-full flex flex-col rounded-2xl border border-inv-primary/30 bg-inv-card/80 backdrop-blur p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-inv-primary/50 hover:shadow-[0_20px_50px_var(--inv-shadow-card)]">
                <span className="mb-4 font-inv-script text-4xl text-inv-primary/90">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-inv-heading text-2xl text-inv-text-soft">
                  {it.label || `Ubicación ${i + 1}`}
                </h3>
                <p className="mt-1 text-inv-text-soft font-light">{it.place}</p>
                <div className="mt-auto pt-6 flex gap-2">
                  {googleUrl(it) && (
                    <>
                      <a
                        href={googleUrl(it)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-lg bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent text-center text-sm font-semibold px-3 py-2.5 shadow-md hover:brightness-110 active:scale-[.98] transition-all"
                      >
                        Google Maps
                      </a>
                      {wazeUrl(it) && (
                        <a
                          href={wazeUrl(it)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-lg border border-inv-primary/60 text-inv-text-soft text-center text-sm px-3 py-2.5 hover:bg-inv-primary/15 active:scale-[.98] transition-all"
                        >
                          Waze
                        </a>
                      )}
                    </>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}