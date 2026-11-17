import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Trm, trmActual, trmEntre } from './src/api/trm';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function hoy(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function haceDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatearPesos(valor: number): string {
  const [entero, decimales] = valor.toFixed(2).split('.');
  return `$ ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales}`;
}

function esFechaValida(f: string): boolean {
  return FECHA_REGEX.test(f) && !Number.isNaN(new Date(f).getTime());
}

export default function App() {
  const [actual, setActual] = useState<Trm | undefined>();
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [resultados, setResultados] = useState<Trm[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarActual() {
    try {
      setActual(await trmActual());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    cargarActual();
  }, []);

  async function consultarRango() {
    // Validación de los parámetros antes de enviarlos al servicio
    if (!esFechaValida(desde) || !esFechaValida(hasta)) {
      setError('Use el formato AAAA-MM-DD en ambas fechas.');
      return;
    }
    if (desde > hasta) {
      setError('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }

    setCargando(true);
    setError(null);
    try {
      setResultados(await trmEntre(desde, hasta));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar style="auto" />
      <Text style={styles.titulo}>TRM Colombia</Text>

      {/* TRM vigente */}
      <View style={styles.actual}>
        <Text style={styles.actualEtiqueta}>TRM vigente</Text>
        {actual ? (
          <>
            <Text style={styles.actualValor}>{formatearPesos(actual.valor)}</Text>
            <Text style={styles.actualFecha}>
              Vigencia: {actual.vigenciaDesde}
              {actual.vigenciaHasta !== actual.vigenciaDesde ? ` a ${actual.vigenciaHasta}` : ''}
            </Text>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      {/* Parámetros enviados al servicio */}
      <Text style={styles.subtitulo}>Consultar por rango de fechas</Text>
      <View style={styles.fila}>
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Desde</Text>
          <TextInput
            style={styles.input}
            value={desde}
            onChangeText={setDesde}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Hasta</Text>
          <TextInput
            style={styles.input}
            value={hasta}
            onChangeText={setHasta}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>
      </View>
      <Pressable style={styles.boton} onPress={consultarRango} disabled={cargando}>
        <Text style={styles.botonTexto}>Consultar</Text>
      </Pressable>

      {cargando && <ActivityIndicator size="large" style={{ marginTop: 16 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Respuesta del servicio */}
      <FlatList
        data={resultados}
        keyExtractor={(item) => item.vigenciaDesde}
        style={{ marginTop: 8 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemFecha}>
              {item.vigenciaDesde}
              {item.vigenciaHasta !== item.vigenciaDesde ? ` → ${item.vigenciaHasta}` : ''}
            </Text>
            <Text style={styles.itemValor}>{formatearPesos(item.valor)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitulo: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  actual: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  actualEtiqueta: { color: '#2e7d32', fontWeight: '600' },
  actualValor: { fontSize: 32, fontWeight: '700', marginVertical: 4 },
  actualFecha: { color: '#555' },
  fila: { flexDirection: 'row', gap: 8 },
  campo: { flex: 1 },
  etiqueta: { fontSize: 12, color: '#555', marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  boton: {
    backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 8,
    alignItems: 'center', marginTop: 10,
  },
  botonTexto: { color: '#fff', fontWeight: '600' },
  error: { color: '#c62828', marginTop: 8 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  itemFecha: { color: '#333' },
  itemValor: { fontWeight: '600' },
});