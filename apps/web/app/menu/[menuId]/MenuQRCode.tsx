
"use client";

import { QRCodeSVG } from "qrcode.react";

interface MenuQRCodeProps {
  menuId: string;
}

export default function MenuQRCode({ menuId }: MenuQRCodeProps) {
  const menuUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/menu/${menuId}`
      : "";

  return (
    <div className="mt-12 flex flex-col items-center rounded-2xl border border-[#E8E1D6] bg-white p-8">
      <h2 className="mb-2 font-serif text-2xl text-[#34352D]">
        Escanea nuestra carta
      </h2>

      <p className="mb-6 text-sm text-[#77766D]">
        Accede a nuestra carta digital
      </p>

      <QRCodeSVG
        value={menuUrl}
        size={220}
        level="H"
        marginSize={4}
        fgColor="#34352D"
        bgColor="#FFFFFF"
      />

      <p className="mt-5 text-xs text-[#A49B8F]">
        Carta digital creada con MenuMind
      </p>
    </div>
  );
}
