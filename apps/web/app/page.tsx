"use client";

import { useState } from "react";

interface MenuItem {
  name: string;
  category: string;
  price: number | null;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [translatedItems, setTranslatedItems] = useState<MenuItem[]>([]);
  const [translating, setTranslating] = useState(false);

  // Any change to the Spanish items makes the previous translation stale:
  // translations are matched by position, so we clear them to avoid saving
  // an English name on the wrong dish.
  function updateMenuItems(updatedItems: MenuItem[]) {
    setMenuItems(updatedItems);
    setTranslatedItems([]);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setError("");
    }
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:3001/menus/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el archivo");
      }

      updateMenuItems(data.menu.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ha ocurrido un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmMenu = async () => {
    if (!restaurantName.trim()) {
      setModalMessage(
        "Escribe el nombre de tu restaurante antes de confirmar la carta.",
      );
      setShowModal(true);
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/menus/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        
body: JSON.stringify({
  restaurant: restaurantName,
  items: menuItems.map((item, index) => ({
    ...item,
    nameEn: translatedItems[index]?.name ?? null,
    categoryEn: translatedItems[index]?.category ?? null,
  })),
}),

      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar la carta.");
      }

      setModalMessage("¡Tu carta se ha guardado correctamente!");
      setShowModal(true);
    } catch (error) {
      setModalMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la carta. Inténtalo de nuevo.",
      );
      setShowModal(true);
    }
  };

  const handleTranslateMenu = async () => {
    setTranslating(true);

    try {
      const response = await fetch("http://localhost:3001/menus/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: menuItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo traducir la carta.");
      }

      setTranslatedItems(data.items);
      setModalMessage("¡Tu carta se ha traducido al inglés correctamente!");
      setShowModal(true);
    } catch (error) {
      console.error("Error al traducir:", error);

      setModalMessage(
        error instanceof Error
          ? error.message
          : "No se pudo traducir la carta.",
      );
      setShowModal(true);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F5EF] text-[#34352D]">
      {/* Navegación */}
      <header className="flex items-center justify-between border-b border-[#E8E1D6] px-6 py-5 md:px-16">
        <div className="text-2xl font-semibold tracking-tight">
          menu<span className="text-[#B96F50]">mind</span>
        </div>

        <span className="text-sm text-[#77766D]">
          Menús digitales, sin complicaciones
        </span>
      </header>

      {/* Contenido principal */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center md:py-28">
        <span className="mb-6 rounded-full border border-[#E5D6C7] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#A5684D]">
          Tu carta, en otro idioma
        </span>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          Tu carta merece
          <br />
          <span className="font-serif italic text-[#B96F50]">
            llegar a todos.
          </span>
        </h1>

        <p className="mt-7 max-w-xl text-base leading-7 text-[#77766D] md:text-lg">
          Convierte la carta de tu restaurante en un menú digital y multilingüe.
          Sube tu documento y nosotros te ayudamos con el resto.
        </p>

        {/* Zona de subida */}
        <div className="mt-14 w-full max-w-4xl rounded-3xl border border-dashed border-[#CDB9A5] bg-[#FFFDFA] p-8 shadow-sm md:p-14">
          {/* Nombre del restaurante */}
          <div className="mb-8 text-left">
            <label
              htmlFor="restaurantName"
              className="mb-2 block text-sm font-medium text-[#51443B]"
            >
              Nombre de tu restaurante
            </label>

            <input
              id="restaurantName"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ej. La Taberna del Puerto"
              className="w-full rounded-xl border border-[#E5D8CC] bg-white px-4 py-3 text-[#51443B] outline-none transition focus:border-[#B96F50]"
            />
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E8DD] text-3xl">
            ↑
          </div>

          <h2 className="text-xl font-semibold">Empieza con tu carta</h2>

          <p className="mt-3 text-sm text-[#888276]">
            Sube tu carta en formato PDF.
          </p>

          {/* Selector y procesamiento */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <label className="inline-flex w-56 cursor-pointer items-center justify-center rounded-full bg-[#B96F50] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#9F5A3E]">
              {file ? "Cambiar archivo" : "Seleccionar mi carta"}

              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              className="inline-flex w-56 items-center justify-center rounded-full bg-[#34352D] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#55564B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Procesando..." : "Procesar mi carta"}
            </button>
          </div>

          {/* Revisión de la carta */}
          {menuItems.length > 0 && (
            <section className="mx-auto mt-12 w-full max-w-3xl">
              <h2 className="mb-2 text-2xl font-semibold">Revisa tu carta</h2>

              <p className="mb-6 text-sm text-[#77766D]">
                Comprueba que los platos y precios se hayan extraído
                correctamente.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#E6DED1] bg-white">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-[#F1ECE3]">
                    <tr>
                      <th className="px-5 py-4">Plato</th>
                      <th className="px-5 py-4">Categoría</th>
                      <th className="px-5 py-4">Precio</th>
                      <th className="px-5 py-4">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {menuItems.map((item, index) => (
                      <tr key={index} className="border-t border-[#E6DED1]">
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={item.name ?? ""}
                            onChange={(e) => {
                              const updatedItems = [...menuItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                name: e.target.value,
                              };
                              updateMenuItems(updatedItems);
                            }}
                            className="w-full rounded-lg border border-[#E6DED1] bg-transparent px-3 py-2 outline-none focus:border-[#B66B50]"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={item.category ?? ""}
                            onChange={(e) => {
                              const updatedItems = [...menuItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                category: e.target.value,
                              };
                              updateMenuItems(updatedItems);
                            }}
                            className="w-full rounded-lg border border-[#E6DED1] bg-transparent px-3 py-2 outline-none focus:border-[#B66B50]"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price ?? ""}
                              placeholder="Sin precio"
                              onChange={(e) => {
                                const updatedItems = [...menuItems];
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  price:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                };
                                updateMenuItems(updatedItems);
                              }}
                              className="w-24 rounded-lg border border-[#E6DED1] bg-transparent px-3 py-2 outline-none focus:border-[#B66B50]"
                            />
                            <span>€</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = menuItems.filter(
                                (_, itemIndex) => itemIndex !== index,
                              );
                              updateMenuItems(updatedItems);
                            }}
                            className="rounded-lg px-3 py-2 text-sm text-[#B96F50] transition-colors hover:bg-[#F3E8DD]"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón de traducción: fuera de la tabla */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleTranslateMenu}
                  disabled={translating}
                  className="rounded-full bg-[#B96F50] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#9F5A3E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {translating ? "Traduciendo..." : "Traducir carta al inglés"}
                </button>
              </div>

              {/* Carta traducida */}

              {/* Carta traducida */}
              {translatedItems.length > 0 && (
                <div className="mt-10">
                  <h2 className="mb-2 text-2xl font-semibold">
                    Tu carta en inglés
                  </h2>

                  <p className="mb-6 text-sm text-[#77766D]">
                    Así verán tus clientes la carta traducida.
                  </p>

                  <div className="overflow-x-auto rounded-2xl border border-[#E6DED1] bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F1ECE3]">
                        <tr>
                          <th className="px-5 py-4">Dish</th>
                          <th className="px-5 py-4">Category</th>
                          <th className="px-5 py-4">Price</th>
                        </tr>
                      </thead>

                      <tbody>
                        {translatedItems.map((item, index) => (
                          <tr key={index} className="border-t border-[#E6DED1]">
                            <td className="px-5 py-4 font-medium">
                              {item.name}
                            </td>

                            <td className="px-5 py-4 text-[#77766D]">
                              {item.category}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              {item.price !== null && item.price !== undefined
                                ? `${item.price} €`
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirmar carta */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirmMenu}
                  className="rounded-xl bg-[#B96F50] px-8 py-3 font-medium text-white transition-colors hover:bg-[#A45E43]"
                >
                  Confirmar carta
                </button>
              </div>
            </section>
          )}

          {/* Archivo seleccionado */}
          {file && (
            <p className="mt-4 text-sm text-[#77766D]">
              Archivo seleccionado: {file.name}
            </p>
          )}

          {/* Mensaje de error */}
          {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

          <p className="mt-5 text-xs text-[#A49B8F]">
            Formatos admitidos: PDF, JPG y PNG
          </p>
        </div>

        {/* Características */}
        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-8 text-left sm:grid-cols-3">
          <div>
            <span className="text-sm font-semibold text-[#B96F50]">01</span>
            <h3 className="mt-2 font-medium">Sube tu carta</h3>
            <p className="mt-2 text-sm leading-6 text-[#888276]">
              Partimos de tu menú actual, sin tener que escribirlo de nuevo.
            </p>
          </div>

          <div>
            <span className="text-sm font-semibold text-[#B96F50]">02</span>
            <h3 className="mt-2 font-medium">Revisa los platos</h3>
            <p className="mt-2 text-sm leading-6 text-[#888276]">
              Comprueba los nombres y precios antes de publicar.
            </p>
          </div>

          <div>
            <span className="text-sm font-semibold text-[#B96F50]">03</span>
            <h3 className="mt-2 font-medium">Llega a más clientes</h3>
            <p className="mt-2 text-sm leading-6 text-[#888276]">
              Prepara tu menú multilingüe para compartirlo mediante QR.
            </p>
          </div>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="border-t border-[#E8E1D6] px-6 py-7 text-center text-xs text-[#A49B8F]">
        © 2026 MenuMind · Hecho para restaurantes
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34352D]/50 px-6">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFDFA] p-8 text-center shadow-xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E8DD] text-2xl text-[#B96F50]">
              !
            </div>

            <h2 className="text-xl font-semibold text-[#34352D]">Aviso</h2>

            <p className="mt-4 leading-7 text-[#77766D]">{modalMessage}</p>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-7 rounded-full bg-[#B96F50] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#9F5A3E]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
