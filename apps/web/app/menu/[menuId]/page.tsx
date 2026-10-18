"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import MenuQRCode from "./MenuQRCode";

interface MenuItem {
  id: string;
  name: string;
  nameEn: string | null;
  price: number | null;
  category: string;
  categoryEn: string | null;
  sortOrder: number;
}

interface Menu {
  id: string;
  restaurant: string;
  title: string;
  items: MenuItem[];
}

function PublicMenuContent() { 
  const params = useParams<{ menuId: string }>();
  const menuId = params.menuId;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"es" | "en">("es");

  
useEffect(() => {
  async function loadMenu() {
    try {
      const response = await fetch(
        `http://192.168.18.47:3001/menus/${encodeURIComponent(menuId)}`,
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar la carta.");
      }

      setMenu(data.menu);
    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Ha ocurrido un error al cargar la carta.",
      );
    } finally {
      setLoading(false);
    }
  }

  loadMenu();
}, [menuId]);

  const groupedItems = useMemo(() => {
    if (!menu) return [];

    const groups = new Map<string, MenuItem[]>();

    menu.items.forEach((item) => {
      // Agrupamos siempre por la categoría original
      const originalCategory = item.category || "Otros";

      if (!groups.has(originalCategory)) {
        groups.set(originalCategory, []);
      }

      groups.get(originalCategory)!.push(item);
    });

    return Array.from(groups.entries());
  }, [menu]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F5EF] text-[#77766D]">
        Cargando carta...
      </main>
    );
  }

  if (error || !menu) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F5EF] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#34352D]">
            No encontramos esta carta
          </h1>
          <p className="mt-3 text-[#77766D]">
            {error || "Comprueba que el enlace sea correcto."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F5EF] text-[#34352D]">
      <header className="border-b border-[#E8E1D6] px-6 py-6 text-center">
        <p className="text-xl font-semibold tracking-tight">
          menu<span className="text-[#B96F50]">mind</span>
        </p>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="mb-8 flex justify-center gap-2">
          <button
            onClick={() => setLanguage("es")}
            className={`rounded-full px-5 py-2 text-sm transition ${
              language === "es"
                ? "bg-[#A5684D] text-white"
                : "border border-[#DCCDBD] text-[#77766D]"
            }`}
          >
            Español
          </button>

          <button
            onClick={() => setLanguage("en")}
            className={`rounded-full px-5 py-2 text-sm transition ${
              language === "en"
                ? "bg-[#A5684D] text-white"
                : "border border-[#DCCDBD] text-[#77766D]"
            }`}
          >
            English
          </button>
        </div>
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#A5684D]">
            Nuestra carta
          </p>

          <h1 className="font-serif text-4xl font-semibold md:text-5xl">
            {menu.restaurant}
          </h1>

          <div className="mx-auto mt-6 h-px w-16 bg-[#B96F50]" />
        </div>

        <div className="space-y-12">
          {groupedItems.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-6 border-b border-[#DCCDBD] pb-3 font-serif text-2xl text-[#A5684D]">
                {language === "en" ? items[0].categoryEn || category : category}
              </h2>

              <div className="space-y-6">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-start justify-between gap-4"
                  >
                    <h3 className="font-medium leading-7">
                      {language === "en" ? item.nameEn || item.name : item.name}
                    </h3>

                    <span className="shrink-0 whitespace-nowrap font-medium">
                      {item.price !== null
                        ? `${item.price.toFixed(2).replace(".", ",")} €`
                        : ""}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <MenuQRCode menuId={menuId} />

        <footer className="mt-16 border-t border-[#E8E1D6] pt-6 text-center text-xs text-[#A49B8F]">
          Carta digital creada con MenuMind
        </footer>
      </section>
    </main>
  );
}

export default function PublicMenuPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Cargando carta...</p>}>
      <PublicMenuContent />
    </Suspense>
  );
}
