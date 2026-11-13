
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [estado, setEstado] = useState("Conectando...");

  useEffect(() => {
    async function probarConexion() {
      const { error } = await supabase.rpc(
        "irish_consultar_cupon",
        { p_token: "prueba-de-conexion" }
      );

      if (error) {
        setEstado("Error: " + error.message);
      } else {
        setEstado("Conexión exitosa con Supabase");
      }
    }

    probarConexion();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#102d23] text-white">
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold text-[#e5d3a6]">
          IRISH GARDEN
        </h1>

        <p className="mt-2">Sistema de Cupones QR</p>

        <p className="mt-8">{estado}</p>
      </div>
    </main>
  );
}