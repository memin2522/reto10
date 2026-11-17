// Cliente del servicio web de la TRM (API SODA de datos.gov.co)
// Conjunto: "Tasa de Cambio Representativa del Mercado - TRM" (id: 32sa-8pi3)
// Campos: valor, unidad, vigenciadesde, vigenciahasta

const BASE_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json';

// Opcional: token gratuito de datos.gov.co para evitar limitación de peticiones
const APP_TOKEN: string = '';

export interface Trm {
  valor: number;
  unidad: string;
  vigenciaDesde: string; // YYYY-MM-DD
  vigenciaHasta: string; // YYYY-MM-DD
}

function construirQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function consultar(params: Record<string, string>): Promise<Trm[]> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (APP_TOKEN) {
    headers['X-App-Token'] = APP_TOKEN;
  }

  const respuesta = await fetch(`${BASE_URL}?${construirQuery(params)}`, { headers });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}: ${await respuesta.text()}`);
  }

  // Procesamiento del JSON (equivalente a JSONArray/JSONObject del SDK de Android)
  const datos = JSON.parse(await respuesta.text());
  if (!Array.isArray(datos)) {
    throw new Error('La respuesta no es un arreglo JSON');
  }

  return datos.map((obj: Record<string, string>) => ({
    valor: Number(obj.valor),
    unidad: obj.unidad,
    vigenciaDesde: obj.vigenciadesde?.slice(0, 10),
    vigenciaHasta: obj.vigenciahasta?.slice(0, 10),
  }));
}

/** TRM vigente más reciente. */
export async function trmActual(): Promise<Trm | undefined> {
  const datos = await consultar({ $order: 'vigenciahasta DESC', $limit: '1' });
  return datos[0];
}

/**
 * TRM cuyo período de vigencia se cruza con [desde, hasta].
 * Una TRM puede cubrir varios días (p. ej., fines de semana y festivos),
 * por eso se compara por solapamiento de intervalos.
 */
export async function trmEntre(desde: string, hasta: string): Promise<Trm[]> {
  return consultar({
    $where: `vigenciadesde <= '${hasta}' AND vigenciahasta >= '${desde}'`,
    $order: 'vigenciadesde DESC',
    $limit: '1000',
  });
}