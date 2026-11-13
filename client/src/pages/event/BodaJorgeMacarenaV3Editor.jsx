import { Button } from "../../components/ui.jsx";
import { setField } from "../../invitation/schema/fields.js";
import { withUid } from "../../invitation/schema/normalize.js";
import StayTravelEditor from "./StayTravelEditor.jsx";
import { FileUploader } from "./editorFields.jsx";

/* ------------------------------------------------------------------
   Editor dedicado de la plantilla `boda_jorge_macarena` (diseño v3).
   Agrupa los bloques que no existen en el resto de plantillas:
   historia/música, Icebreaker, Recomendaciones, ceremonia/celebración,
   hoteles, cita de Hospedaje, correo de mensajes y viaje/hospedaje.
------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RECOMMENDATION_ICONS = [
  { value: "shoe", label: "Calzado" },
  { value: "weather", label: "Clima" },
  { value: "transport", label: "Transporte" },
  { value: "taxi", label: "Moverse por Granada" },
  { value: "stay", label: "Alojamiento" },
];

function emptyLocation() {
  return withUid({
    label: "",
    place: "",
    url: "",
    description: "",
    time_label: "",
    time_value: "",
    when_label: "",
    when_value: "",
    image: "",
    map_image: "",
  });
}

function emptyRecommendation() {
  return withUid({ icon: "stay", title: "", text: "", phone: "" });
}

function emptyLodging() {
  return withUid({ name: "", note: "", url: "" });
}

export default function BodaJorgeMacarenaV3Editor({
  form,
  setForm,
  inputCls,
  onFileUploadingChange,
  giftMessageEmail,
  setGiftMessageEmail,
  giftMessageEmail2,
  setGiftMessageEmail2,
}) {
  const update = (path, value) =>
    setForm((current) => setField(current, path, value));

  const icebreaker = form.icebreaker || {};
  const recommendations = form.recommendations || {};
  const recommendationItems = Array.isArray(recommendations.items)
    ? recommendations.items
    : [];
  const locations = Array.isArray(form.locations) ? form.locations : [];
  const lodging = Array.isArray(form.lodging) ? form.lodging : [];
  const stay = form.stay || {};
  const email = String(giftMessageEmail || "").trim();
  const emailInvalid = !!email && !EMAIL_RE.test(email);
  const email2 = String(giftMessageEmail2 || "").trim();
  const email2Invalid = !!email2 && !EMAIL_RE.test(email2);

  const setRecommendation = (index, patch) =>
    setForm((current) => {
      const list = current.recommendations?.items;
      const items = Array.isArray(list) ? list : [];
      return setField(
        current,
        "recommendations.items",
        items.map((item, i) => (i === index ? { ...item, ...patch } : item))
      );
    });

  const setLocation = (index, key, value) =>
    setForm((current) => {
      const list = Array.isArray(current.locations) ? current.locations : [];
      return {
        ...current,
        locations: list.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      };
    });

  const setLodging = (index, key, value) =>
    setForm((current) => {
      const list = Array.isArray(current.lodging) ? current.lodging : [];
      return {
        ...current,
        lodging: list.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      };
    });

  return (
    <>
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">
          Granada, España · relato y música
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          El relato se divide en párrafos con una línea en blanco. La música se
          reproduce en bucle al tocar el botón flotante (sin autoplay).
        </p>
        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">Relato</span>
          <textarea
            className={inputCls}
            rows={6}
            value={form.story || ""}
            onChange={(e) => update("story", e.target.value)}
            placeholder={
              "A nuestra familia y amigos…\n\nEl tequila y la cerveza Alhambra corren por nuestra cuenta."
            }
          />
        </label>

        <div className="mt-4">
          <label className="block">
            <span className="text-sm text-gray-400 mb-1 block">
              Música (URL del audio)
            </span>
            <input
              className={inputCls}
              value={form.music_url || ""}
              onChange={(e) => update("music_url", e.target.value)}
              placeholder="https://… (MP3 / M4A)"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="mt-3">
            <FileUploader
              label="Archivo de audio"
              value={form.music_url || ""}
              onChange={(url) => update("music_url", url)}
              kind="audio"
              onUploadingChange={onFileUploadingChange}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Sin audio, el botón de música no se monta.
          </p>
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <FileUploader
            label="Imagen para compartir (Open Graph)"
            value={form.og_image || ""}
            onChange={(url) => update("og_image", url)}
            onUploadingChange={onFileUploadingChange}
          />
          <label className="block mt-3">
            <span className="text-sm text-gray-400 mb-1 block">
              O pega una URL (opcional)
            </span>
            <input
              className={inputCls}
              value={form.og_image || ""}
              onChange={(e) => update("og_image", e.target.value)}
              placeholder="https://… (JPG/PNG 1200×630)"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">Icebreaker</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tarjeta previa a la boda (martes 8 de junio). Se oculta si está
          desactivada.
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!icebreaker.enabled}
            onChange={(e) => update("icebreaker.enabled", e.target.checked)}
            className="h-4 w-4 accent-gold-400"
          />
          <span className="text-sm text-gray-300">Mostrar Icebreaker</span>
        </label>

        {icebreaker.enabled && (
          <div className="mt-4 space-y-3 border-l border-gray-800 pl-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">Eyebrow</span>
                <input
                  className={inputCls}
                  value={icebreaker.eyebrow || ""}
                  onChange={(e) => update("icebreaker.eyebrow", e.target.value)}
                  placeholder="Antes del gran día"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">Título</span>
                <input
                  className={inputCls}
                  value={icebreaker.title || ""}
                  onChange={(e) => update("icebreaker.title", e.target.value)}
                  placeholder="Icebreaker"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">Texto</span>
              <textarea
                className={inputCls}
                rows={3}
                value={icebreaker.text || ""}
                onChange={(e) => update("icebreaker.text", e.target.value)}
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">Fecha</span>
                <input
                  className={inputCls}
                  value={icebreaker.date_label || ""}
                  onChange={(e) => update("icebreaker.date_label", e.target.value)}
                  placeholder="Martes 8 de junio"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  Horario y lugar
                </span>
                <input
                  className={inputCls}
                  value={icebreaker.time_place_label || ""}
                  onChange={(e) =>
                    update("icebreaker.time_place_label", e.target.value)
                  }
                  placeholder="Por confirmar"
                />
              </label>
            </div>
            <FileUploader
              label="Dibujo (opcional)"
              value={icebreaker.image || ""}
              onChange={(url) => update("icebreaker.image", url)}
              onUploadingChange={onFileUploadingChange}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-white">Recomendaciones</h2>
          <Button
            type="button"
            variant="secondary"
            disabled={!recommendations.enabled}
            onClick={() =>
              update("recommendations.items", [
                ...recommendationItems,
                emptyRecommendation(),
              ])
            }
          >
            + Agregar
          </Button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Cinco consejos con icono (calzado, clima, transporte, taxi y
          alojamiento). Puedes usar <code className="text-gray-300">**negrita**</code>{" "}
          y <code className="text-gray-300">{"{phone}"}</code> en el texto.
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!recommendations.enabled}
            onChange={(e) => update("recommendations.enabled", e.target.checked)}
            className="h-4 w-4 accent-gold-400"
          />
          <span className="text-sm text-gray-300">
            Mostrar recomendaciones
          </span>
        </label>

        {recommendations.enabled && (
          <div className="mt-4 space-y-4 border-l border-gray-800 pl-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">Eyebrow</span>
                <input
                  className={inputCls}
                  value={recommendations.eyebrow || ""}
                  onChange={(e) =>
                    update("recommendations.eyebrow", e.target.value)
                  }
                  placeholder="Para que todo salga perfecto"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">Título</span>
                <input
                  className={inputCls}
                  value={recommendations.title || ""}
                  onChange={(e) =>
                    update("recommendations.title", e.target.value)
                  }
                  placeholder="Recomendaciones"
                />
              </label>
            </div>

            <div className="space-y-3">
              {recommendationItems.map((item, index) => (
                <div
                  key={item._uid ?? index}
                  className="rounded-xl border border-gray-800 p-3 space-y-2"
                >
                  <div className="grid sm:grid-cols-[minmax(0,180px)_1fr_auto] gap-2 items-end">
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">
                        Icono
                      </span>
                      <select
                        className={inputCls}
                        value={item.icon || "stay"}
                        onChange={(e) =>
                          setRecommendation(index, { icon: e.target.value })
                        }
                      >
                        {RECOMMENDATION_ICONS.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">
                        Título
                      </span>
                      <input
                        className={inputCls}
                        value={item.title || ""}
                        onChange={(e) =>
                          setRecommendation(index, { title: e.target.value })
                        }
                        placeholder="Calzado"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "recommendations.items",
                          recommendationItems.filter((_, i) => i !== index)
                        )
                      }
                      className="shrink-0 justify-self-start sm:justify-self-auto text-sm text-red-500 hover:text-red-400 px-2 pb-2"
                    >
                      Quitar
                    </button>
                  </div>
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">Texto</span>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={item.text || ""}
                      onChange={(e) =>
                        setRecommendation(index, { text: e.target.value })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">
                      Teléfono (opcional)
                    </span>
                    <input
                      className={inputCls}
                      value={item.phone || ""}
                      onChange={(e) =>
                        setRecommendation(index, { phone: e.target.value })
                      }
                      placeholder="+34 958 28 00 00"
                      inputMode="tel"
                    />
                  </label>
                </div>
              ))}
            </div>

            <FileUploader
              label="Dibujo (opcional)"
              value={recommendations.image || ""}
              onChange={(url) => update("recommendations.image", url)}
              onUploadingChange={onFileUploadingChange}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-white">
            Ceremonia y celebración
          </h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              update("locations", [...locations, emptyLocation()])
            }
          >
            + Agregar
          </Button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Una tarjeta por ubicación. La primera se rotula como ceremonia y la
          segunda como celebración. El nombre va en "label", la dirección en
          "place" y el relato en "description".
        </p>

        <div className="space-y-4">
          {locations.map((item, index) => (
            <div
              key={item._uid ?? index}
              className="rounded-xl border border-gray-800 p-3 space-y-2"
            >
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  value={item.label || ""}
                  onChange={(e) => setLocation(index, "label", e.target.value)}
                  placeholder="Nombre (San Pedro y San Pablo)"
                />
                <input
                  className={inputCls}
                  value={item.place || ""}
                  onChange={(e) => setLocation(index, "place", e.target.value)}
                  placeholder="Dirección (Carrera del Darro, 2 · Granada)"
                />
                <input
                  className={inputCls}
                  value={item.url || ""}
                  onChange={(e) => setLocation(index, "url", e.target.value)}
                  placeholder="Enlace de Google Maps (opcional)"
                />
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={item.time_label || ""}
                    onChange={(e) =>
                      setLocation(index, "time_label", e.target.value)
                    }
                    placeholder="Etiqueta de hora (Hora)"
                  />
                  <input
                    className={inputCls}
                    value={item.time_value || ""}
                    onChange={(e) =>
                      setLocation(index, "time_value", e.target.value)
                    }
                    placeholder="Hora (18:00 h)"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={item.when_label || ""}
                    onChange={(e) =>
                      setLocation(index, "when_label", e.target.value)
                    }
                    placeholder="Etiqueta de cuándo (Cuándo)"
                  />
                  <input
                    className={inputCls}
                    value={item.when_value || ""}
                    onChange={(e) =>
                      setLocation(index, "when_value", e.target.value)
                    }
                    placeholder="Cuándo (Al salir de la iglesia)"
                  />
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  Descripción
                </span>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={item.description || ""}
                  onChange={(e) =>
                    setLocation(index, "description", e.target.value)
                  }
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <FileUploader
                    label="Dibujo"
                    value={item.image || ""}
                    onChange={(url) => setLocation(index, "image", url)}
                    onUploadingChange={onFileUploadingChange}
                  />
                  <input
                    className={`${inputCls} mt-2`}
                    value={item.image || ""}
                    onChange={(e) => setLocation(index, "image", e.target.value)}
                    placeholder="URL del dibujo"
                  />
                </div>
                <div>
                  <FileUploader
                    label="Mapa estático"
                    value={item.map_image || ""}
                    onChange={(url) => setLocation(index, "map_image", url)}
                    onUploadingChange={onFileUploadingChange}
                  />
                  <input
                    className={`${inputCls} mt-2`}
                    value={item.map_image || ""}
                    onChange={(e) =>
                      setLocation(index, "map_image", e.target.value)
                    }
                    placeholder="URL del mapa"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  update(
                    "locations",
                    locations.filter((_, i) => i !== index)
                  )
                }
                className="text-sm text-red-500 hover:text-red-400"
              >
                Eliminar ubicación
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-white">
            Hoteles recomendados
          </h2>
          <Button
            type="button"
            variant="secondary"
            disabled={lodging.length >= 2}
            onClick={() => update("lodging", [...lodging, emptyLodging()])}
          >
            + Agregar
          </Button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Máximo 2 hoteles. El enlace abre Google Maps o la web del hotel.
        </p>

        <div className="space-y-3">
          {lodging.map((hotel, index) => (
            <div
              key={hotel._uid ?? index}
              className="rounded-xl border border-gray-800 p-3 space-y-2"
            >
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  value={hotel.name || ""}
                  onChange={(e) => setLodging(index, "name", e.target.value)}
                  placeholder="Nombre (Hotel Alhambra Palace)"
                />
                <input
                  className={inputCls}
                  value={hotel.url || ""}
                  onChange={(e) => setLodging(index, "url", e.target.value)}
                  placeholder="Enlace (https://…)"
                />
              </div>
              <textarea
                className={inputCls}
                rows={2}
                value={hotel.note || ""}
                onChange={(e) => setLodging(index, "note", e.target.value)}
                placeholder="Descripción breve"
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    "lodging",
                    lodging.filter((_, i) => i !== index)
                  )
                }
                className="text-sm text-red-500 hover:text-red-400"
              >
                Quitar hotel
              </button>
            </div>
          ))}
        </div>
        {lodging.length >= 2 && (
          <p className="text-xs text-gray-500 mt-2">Máximo 2 hoteles.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">
          Hospedaje · cita
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Cita literaria al pie de la tarjeta de Hospedaje.
        </p>
        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">Cita</span>
          <textarea
            className={inputCls}
            rows={4}
            value={stay.quote || ""}
            onChange={(e) => update("stay.quote", e.target.value)}
            placeholder={"«Dale limosna, mujer,\nque no hay en la vida nada…»"}
          />
        </label>
        <label className="block mt-3">
          <span className="text-sm text-gray-400 mb-1 block">Autor</span>
          <input
            className={inputCls}
            value={stay.quote_author || ""}
            onChange={(e) => update("stay.quote_author", e.target.value)}
            placeholder="Poeta mexicano: Francisco de Icaza"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">
          Correos para mensajes de los novios
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Ambos correos recibirán los mensajes que los invitados escriban desde
          la tarjeta de Regalo. El segundo es opcional.
        </p>
        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">Email principal</span>
          <input
            className={inputCls}
            type="email"
            value={giftMessageEmail || ""}
            onChange={(e) => setGiftMessageEmail(e.target.value)}
            placeholder="novios@ejemplo.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={emailInvalid ? "true" : undefined}
            aria-describedby={emailInvalid ? "gift-email-error" : undefined}
          />
        </label>
        {emailInvalid && (
          <p id="gift-email-error" className="text-sm text-red-400 mt-2">
            El email principal no tiene un formato válido.
          </p>
        )}

        <label className="block mt-3">
          <span className="text-sm text-gray-400 mb-1 block">
            Email adicional (opcional)
          </span>
          <input
            className={inputCls}
            type="email"
            value={giftMessageEmail2 || ""}
            onChange={(e) => setGiftMessageEmail2(e.target.value)}
            placeholder="otro@ejemplo.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={email2Invalid ? "true" : undefined}
            aria-describedby={email2Invalid ? "gift-email-2-error" : undefined}
          />
        </label>
        {email2Invalid && (
          <p id="gift-email-2-error" className="text-sm text-red-400 mt-2">
            El email adicional no tiene un formato válido.
          </p>
        )}

        {!emailInvalid && !email2Invalid && (
          !email && !email2 ? (
            <p className="text-xs text-amber-400 mt-2">
              Sin correos, los mensajes solo se verán en el panel (Mensajes).
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Se guardan en el evento, no en la configuración pública.
            </p>
          )
        )}
      </section>

      <StayTravelEditor
        form={form}
        setForm={setForm}
        inputCls={inputCls}
      />
    </>
  );
}

