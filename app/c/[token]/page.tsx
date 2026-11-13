
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, TicketPercent, XCircle } from "lucide-react";

type Cupon = {
  serie: string;
  descuento: number;
  estado: string;
};

export default function PaginaCupon({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [cupon, setCupon] = useState<Cupon | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [folio, setFolio] = useState("");
  const [importe, setImporte] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState("");

  const consultar = useCallback(async () => {
    const { data, error } = await supabase.rpc(
      "irish_consultar_cupon",
      { p_token: token }
    );

    setCupon(data?.[0] ?? null);
    setError(error?.message ?? "");
    setCargando(false);
  }, [token]);

  useEffect(() => {
    void consultar();

    supabase.auth.getUser().then(({ data }) => {
      setAutenticado(!!data.user);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_evento, session) => {
        setAutenticado(!!session?.user);
      }
    );

    return () => data.subscription.unsubscribe();
  }, [consultar]);

  async function iniciarSesion() {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
    else setPassword("");
  }

  async function canjear() {
    if (procesando || !cupon) return;

    const monto = Number(importe);

    if (
      !folio.trim() ||
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      setError("Ingresa un folio y un importe válido.");
      return;
    }

    setProcesando(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "irish_canjear_cupon",
      {
        p_token: token,
        p_folio: folio.trim(),
        p_importe: monto,
      }
    );

    if (error) {
      setError(error.message);
      await consultar();
    } else {
      const registro = data?.[0];
      setResultado(
        registro
          ? `Descuento aplicado: $${Number(
              registro.importe_descuento
            ).toFixed(2)}`
          : "Cupón canjeado correctamente."
      );
      await consultar();
    }

    setConfirmar(false);
    setProcesando(false);
  }

  const monto = Number(importe);
  const montoValido =
    importe.trim() !== "" &&
    Number.isFinite(monto) &&
    monto > 0;

  const descuentoCalculado =
    cupon && montoValido
      ? monto * cupon.descuento / 100
      : 0;

  return (
    <main className="min-h-screen bg-[#102d23] text-white px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl bg-[#183d30] p-7 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-[#e5d3a6]">
          IRISH GARDEN
        </h1>
        <p className="text-sm tracking-widest">
          CAFETERÍA BISTRO
        </p>

        <div className="my-8 border-t border-[#466254]" />

        {cargando ? (
          <p>Verificando cupón...</p>
        ) : !cupon ? (
          <div className="space-y-3">
            <XCircle className="mx-auto text-red-300" size={48} />
            <p>Cupón inválido o inexistente</p>
          </div>
        ) : (
          <>
            <TicketPercent
              className="mx-auto text-[#e5d3a6]"
              size={48}
            />

            <p className="mt-5 text-6xl font-bold">
              {cupon.descuento}%
            </p>
            <p className="mt-2 text-[#e5d3a6]">
              DE DESCUENTO
            </p>

            <p className="mt-6 text-sm">{cupon.serie}</p>

            <div className="my-6 border-t border-[#466254]" />

            {cupon.estado === "disponible" ? (
              <div className="space-y-3">
                <CheckCircle2
                  className="mx-auto text-green-400"
                  size={36}
                />
                <p className="font-bold text-green-300">
                  CUPÓN DISPONIBLE
                </p>
                <p className="text-sm">
                  Presenta este cupón en caja.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <XCircle
                  className="mx-auto text-red-300"
                  size={36}
                />
                <p className="font-bold text-red-300">
                  CUPÓN NO DISPONIBLE
                </p>
                <p className="text-sm">
                  Este cupón ya fue utilizado o cancelado.
                </p>
              </div>
            )}

            {cupon.estado === "disponible" && autenticado && (
              <div className="mt-8 space-y-3 text-left">
                <h2 className="text-center font-bold text-[#e5d3a6]">
                  CANJE DE CUPÓN
                </h2>

                <input
                  className="w-full rounded-lg bg-white p-3 text-black"
                  placeholder="Folio del ticket"
                  value={folio}
                  onChange={e => setFolio(e.target.value)}
                />

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg bg-white p-3 text-black"
                  placeholder="Importe de la cuenta"
                  value={importe}
                  onChange={e => setImporte(e.target.value)}
                />

                {montoValido && (
                  <div className="rounded-lg bg-[#102d23] p-4 text-sm">
                    <p>
                      Descuento: ${descuentoCalculado.toFixed(2)}
                    </p>
                    <p className="mt-2 font-bold">
                      Total a pagar: $
                      {(monto - descuentoCalculado).toFixed(2)}
                    </p>
                  </div>
                )}

                {!confirmar ? (
                  <button
                    disabled={!montoValido || !folio.trim()}
                    onClick={() => setConfirmar(true)}
                    className="w-full rounded-lg bg-[#e5d3a6] p-3 font-bold text-[#102d23] disabled:opacity-40"
                  >
                    Revisar canje
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-[#e5d3a6] p-3">
                    <p className="text-center text-sm">
                      Confirma que el descuento ya está
                      aplicado en la venta de Soft Restaurant.
                    </p>
                    <button
                      disabled={procesando}
                      onClick={canjear}
                      className="w-full rounded-lg bg-[#e5d3a6] p-3 font-bold text-[#102d23] disabled:opacity-40"
                    >
                      {procesando
                        ? "Procesando..."
                        : "Confirmar canje definitivo"}
                    </button>
                    <button
                      disabled={procesando}
                      onClick={() => setConfirmar(false)}
                      className="w-full rounded-lg border p-3"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {cupon.estado === "disponible" && !autenticado && (
              <div className="mt-8 space-y-3">
                <p className="text-sm text-[#e5d3a6]">
                  Acceso para personal de caja
                </p>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-white p-3 text-black"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-white p-3 text-black"
                />
                <button
                  onClick={iniciarSesion}
                  className="w-full rounded-lg bg-[#e5d3a6] p-3 font-bold text-[#102d23]"
                >
                  Iniciar sesión
                </button>
              </div>
            )}
          </>
        )}

        {resultado && (
          <p className="mt-5 text-green-300">{resultado}</p>
        )}
        {error && (
          <p role="alert" className="mt-5 text-red-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
