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

      setMenuItems(data.menu.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ha ocurrido un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

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
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E8DD] text-3xl">
            ↑
          </div>

          <h2 className="text-xl font-semibold">Empieza con tu carta</h2>

          <p className="mt-3 text-sm text-[#888276]">
            Sube un PDF o una imagen de tu menú.
          </p>

          {/* Selector y procesamiento */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#B96F50] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#9F5A3E]">
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
              className="inline-flex items-center justify-center rounded-full bg-[#34352D] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#55564B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Procesando..." : "Procesar mi carta"}
            </button>
          </div>

          {menuItems.length > 0 && (
            <section className="mx-auto mt-12 w-full max-w-3xl">
              <h2 className="mb-2 text-2xl font-semibold">Revisa tu carta</h2>

              <p className="mb-6 text-sm text-[#77766D]">
                Comprueba que los platos y precios se hayan extraído
                correctamente.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#E6DED1] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F1ECE3]">
                    <tr>
                      <th className="px-5 py-4">Plato</th>
                      <th className="px-5 py-4">Categoría</th>
                      <th className="px-5 py-4">Precio</th>
                    </tr>
                  </thead>

                  <tbody>
                    {menuItems.map((item, index) => (
                      <tr key={index} className="border-t border-[#E6DED1]">
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updatedItems = [...menuItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                name: e.target.value,
                              };
                              setMenuItems(updatedItems);
                            }}
                            className="w-full rounded-lg border border-[#E6DED1] bg-transparent px-3 py-2 outline-none focus:border-[#B66B50]"
                          />
                        </td>

                        <td className="px-5 py-4 text-[#77766D]">
                          {item.category}
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
                                setMenuItems(updatedItems);
                              }}
                              className="w-24 rounded-lg border border-[#E6DED1] bg-transparent px-3 py-2 outline-none focus:border-[#B66B50]"
                            />
                            <span>€</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </main>
  );
}
