
"use client";

import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  TicketPercent,
  XCircle,
} from "lucide-react";

type Cupon = {
  serie: string;
  descuento: number;
  estado: string;
  tipo_promocion: string;
  descripcion_promocion: string | null;
};

type ResultadoCanje = {
  serie: string;
  descuento: number;
  importe_descuento: number;
  total_pagar: number;
};

function ContenidoCupon({
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
  const [precio1, setPrecio1] = useState("");
  const [precio2, setPrecio2] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState("");

  const consultar = useCallback(async () => {
    setCargando(true);

    const { data, error: errorConsulta } =
      await supabase.rpc("irish_consultar_cupon", {
        p_token: token,
      });

    setCupon((data?.[0] as Cupon | undefined) ?? null);
    setError(errorConsulta?.message ?? "");
    setCargando(false);
  }, [token]);

  useEffect(() => {
    void consultar();

    void supabase.auth.getUser().then(({ data }) => {
      setAutenticado(!!data.user);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_evento, session) => {
        setAutenticado(!!session?.user);
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, [consultar]);

  const es2x1 = cupon?.tipo_promocion === "2x1";

  const monto = Number(importe);
  const p1 = Number(precio1);
  const p2 = Number(precio2);

  const montoValido =
    importe.trim() !== "" &&
    Number.isFinite(monto) &&
    monto > 0;

  const preciosValidos =
    precio1.trim() !== "" &&
    precio2.trim() !== "" &&
    Number.isFinite(p1) &&
    Number.isFinite(p2) &&
    p1 > 0 &&
    p2 > 0 &&
    Number.isInteger(p1 * 100) &&
    Number.isInteger(p2 * 100) &&
    p1 + p2 <= 9999999999.99;

  const formularioValido = es2x1
    ? preciosValidos
    : montoValido;

  const descuentoCalculado =
    cupon && montoValido && !es2x1
      ? Math.round(
          (monto * cupon.descuento) / 100 * 100
        ) / 100
      : 0;

  const descuento2x1 = preciosValidos
    ? Math.min(p1, p2)
    : 0;

  async function iniciarSesion() {
    setError("");

    const { error: errorLogin } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (errorLogin) {
      setError(errorLogin.message);
    } else {
      setPassword("");
    }
  }

  async function canjear() {
    if (
      procesando ||
      !cupon ||
      !folio.trim() ||
      !formularioValido
    ) {
      return;
    }

    setProcesando(true);
    setError("");

    const respuesta = es2x1
      ? await supabase.rpc("irish_canjear_2x1", {
          p_token: token,
          p_folio: folio.trim(),
          p_precio_1: p1,
          p_precio_2: p2,
        })
      : await supabase.rpc("irish_canjear_cupon", {
          p_token: token,
          p_folio: folio.trim(),
          p_importe: monto,
        });

    if (respuesta.error) {
      setError(respuesta.error.message);
      await consultar();
    } else {
      const registro = respuesta.data?.[0] as
        | ResultadoCanje
        | undefined;

      setResultado(
        registro
          ? `Beneficio aplicado: $${Number(
              registro.importe_descuento
            ).toFixed(2)}. Total de ${
              es2x1 ? "las dos bebidas" : "la cuenta"
            }: $${Number(
              registro.total_pagar
            ).toFixed(2)}`
          : "Cupón canjeado correctamente."
      );

      await consultar();
    }

    setConfirmar(false);
    setProcesando(false);
  }

  return (
    <main className="min-h-screen bg-[#102d23] px-4 py-12 text-white">
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
            <XCircle
              className="mx-auto text-red-300"
              size={48}
            />
            <p>Cupón inválido o inexistente</p>
          </div>
        ) : (
          <>
            <TicketPercent
              className="mx-auto text-[#e5d3a6]"
              size={48}
            />

            {es2x1 ? (
              <>
                <p className="mt-5 text-6xl font-bold">
                  2 X 1
                </p>
                <p className="mt-3 font-bold uppercase leading-relaxed text-[#e5d3a6]">
                  EN FRAPPES Y SMOOTHIES CLASICOS
                </p>
              </>
            ) : (
              <>
                <p className="mt-5 text-6xl font-bold">
                  {cupon.descuento}%
                </p>
                <p className="mt-2 text-[#e5d3a6]">
                  DE DESCUENTO
                </p>
              </>
            )}

            <p className="mt-6 text-sm">
              {cupon.serie}
            </p>

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

            {cupon.estado === "disponible" &&
              autenticado && (
                <div className="mt-8 space-y-3 text-left">
                  <h2 className="text-center font-bold text-[#e5d3a6]">
                    CANJE DE CUPÓN
                  </h2>

                  <input
                    className="w-full rounded-lg bg-white p-3 text-black"
                    placeholder="Folio del ticket"
                    value={folio}
                    onChange={(e) => {
                      setFolio(e.target.value);
                      setConfirmar(false);
                    }}
                  />

                  {es2x1 ? (
                    <>
                      <p className="text-sm text-[#e5d3a6]">
                        Ingresa los precios de dos frappés
                        o smoothies clásicos elegibles.
                      </p>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full rounded-lg bg-white p-3 text-black"
                        placeholder="Precio de la primera bebida"
                        value={precio1}
                        onChange={(e) => {
                          setPrecio1(e.target.value);
                          setConfirmar(false);
                        }}
                      />

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full rounded-lg bg-white p-3 text-black"
                        placeholder="Precio de la segunda bebida"
                        value={precio2}
                        onChange={(e) => {
                          setPrecio2(e.target.value);
                          setConfirmar(false);
                        }}
                      />

                      {preciosValidos && (
                        <div className="rounded-lg bg-[#102d23] p-4 text-sm">
                          <p>
                            Subtotal de bebidas: $
                            {(p1 + p2).toFixed(2)}
                          </p>
                          <p className="mt-2">
                            Beneficio 2x1: -$
                            {descuento2x1.toFixed(2)}
                          </p>
                          <p className="mt-2 font-bold">
                            Total de bebidas: $
                            {(p1 + p2 - descuento2x1).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full rounded-lg bg-white p-3 text-black"
                        placeholder="Importe de la cuenta"
                        value={importe}
                        onChange={(e) => {
                          setImporte(e.target.value);
                          setConfirmar(false);
                        }}
                      />

                      {montoValido && (
                        <div className="rounded-lg bg-[#102d23] p-4 text-sm">
                          <p>
                            Descuento: $
                            {descuentoCalculado.toFixed(2)}
                          </p>
                          <p className="mt-2 font-bold">
                            Total a pagar: $
                            {(monto - descuentoCalculado).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {!confirmar ? (
                    <button
                      disabled={
                        !formularioValido || !folio.trim()
                      }
                      onClick={() => setConfirmar(true)}
                      className="w-full rounded-lg bg-[#e5d3a6] p-3 font-bold text-[#102d23] disabled:opacity-40"
                    >
                      Revisar canje
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-[#e5d3a6] p-3">
                      <p className="text-center text-sm">
                        Confirma que el beneficio ya está
                        aplicado en la venta de Soft Restaurant
                        y que las bebidas cumplen la promoción.
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

            {cupon.estado === "disponible" &&
              !autenticado && (
                <div className="mt-8 space-y-3">
                  <p className="text-sm text-[#e5d3a6]">
                    Acceso para personal de caja
                  </p>

                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-white p-3 text-black"
                  />

                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
          <p className="mt-5 text-green-300">
            {resultado}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 text-red-300"
          >
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

export default function PaginaCupon({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#102d23] text-white">
          <p>Verificando cupón de Irish Garden...</p>
        </main>
      }
    >
      <ContenidoCupon params={params} />
    </Suspense>
  );
}
