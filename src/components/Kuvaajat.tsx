import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AppData, VuosiData } from '../types';
import { laskeTasaus, KUUKAUDET } from '../utils/calculations';

interface Props {
  vuosiData: VuosiData;
  appData: AppData;
}

const VARIT = {
  op1: '#3b82f6',
  op2: '#f59e0b',
  vesi: '#60a5fa',
  kiinteisto: '#f87171',
  muut: '#a78bfa',
  ref: '#d1d5db',
};

function euroFormatter(v: number) {
  return v.toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

export default function Kuvaajat({ vuosiData, appData }: Props) {
  const { osapuolet, tontti, vuodet } = appData;
  const op1 = osapuolet[0];
  const op2 = osapuolet[1];

  const prevVuosiData = vuodet.find((v) => v.vuosi === vuosiData.vuosi - 1);

  // --- Vesilaskut kuukausittain ---
  const vesiKuuData = vuosiData.vesilaskut.map((v) => {
    const prev = prevVuosiData?.vesilaskut.find((pv) => pv.kuukausi === v.kuukausi);
    return {
      kk: KUUKAUDET[v.kuukausi - 1],
      Perusmaksu: v.perusmaksu,
      Käyttömaksu: v.kayttomaksu,
      'Edell. vuosi': prev ? prev.perusmaksu + prev.kayttomaksu : undefined,
    };
  });

  // --- Kulujen vuosittainen vertailu (kaikki vuodet joissa dataa) ---
  const vuosiVertailuData = [...vuodet]
    .sort((a, b) => a.vuosi - b.vuosi)
    .filter((v) => {
      const t = laskeTasaus(v, tontti, op1.id, op2.id);
      return t.op1KokonaisKulut + t.op2KokonaisKulut > 0;
    })
    .map((v) => {
      const t = laskeTasaus(v, tontti, op1.id, op2.id);
      return {
        vuosi: String(v.vuosi),
        [`${op1.nimi} vesi`]: Math.round(t.op1VesiKulut),
        [`${op1.nimi} kiinteistövero`]: Math.round(t.op1MaapohjaVero + t.op1RakennusVero),
        [`${op2.nimi} vesi`]: Math.round(t.op2VesiKulut),
        [`${op2.nimi} kiinteistövero`]: Math.round(t.op2MaapohjaVero + t.op2RakennusVero),
        [`${op1.nimi} muut`]: Math.round(t.op1MuutKulut),
        [`${op2.nimi} muut`]: Math.round(t.op2MuutKulut),
      };
    });

  // --- Saldot vuosittain ---
  const saldoData = [...vuodet]
    .sort((a, b) => a.vuosi - b.vuosi)
    .filter((v) => {
      const t = laskeTasaus(v, tontti, op1.id, op2.id);
      return t.op1Maksut + t.op2Maksut > 0;
    })
    .map((v) => {
      const t = laskeTasaus(v, tontti, op1.id, op2.id);
      return {
        vuosi: String(v.vuosi),
        [op1.nimi]: Math.round(t.op1Saldo),
        [op2.nimi]: Math.round(t.op2Saldo),
      };
    });

  // --- Kumulatiivinen vesimaksu kuukausittain ---
  const kumuData = vuosiData.vesilaskut.map((v, i) => {
    const cumSum = vuosiData.vesilaskut
      .slice(0, i + 1)
      .reduce((s, vv) => s + vv.perusmaksu + vv.kayttomaksu, 0);
    const prevCumSum = prevVuosiData
      ? prevVuosiData.vesilaskut
          .slice(0, i + 1)
          .reduce((s, pv) => s + pv.perusmaksu + pv.kayttomaksu, 0)
      : undefined;
    return {
      kk: KUUKAUDET[v.kuukausi - 1],
      [`${vuosiData.vuosi}`]: Math.round(cumSum),
      ...(prevVuosiData ? { [`${vuosiData.vuosi - 1}`]: Math.round(prevCumSum ?? 0) } : {}),
    };
  });

  return (
    <div className="space-y-8 mt-6">
      <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2">
        Kuvaajat
      </h3>

      {/* Vesilaskut kuukausittain */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">
          Vesilaskut kuukausittain {vuosiData.vuosi}
          {prevVuosiData && ` vs ${vuosiData.vuosi - 1}`}
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={vesiKuuData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="kk" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => v + ' €'} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => euroFormatter(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Perusmaksu" stackId="a" fill={VARIT.vesi} />
            <Bar dataKey="Käyttömaksu" stackId="a" fill={VARIT.op1} />
            {prevVuosiData && (
              <Bar dataKey="Edell. vuosi" fill={VARIT.ref} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kumulatiivinen vesimaksu */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">
          Kumulatiivinen vesimaksu vuoden mittaan
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={kumuData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="kk" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => v + ' €'} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => euroFormatter(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey={String(vuosiData.vuosi)}
              stroke={VARIT.op1}
              strokeWidth={2}
              dot={false}
            />
            {prevVuosiData && (
              <Line
                type="monotone"
                dataKey={String(vuosiData.vuosi - 1)}
                stroke={VARIT.ref}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Vuosittainen kuluvertailu */}
      {vuosiVertailuData.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3">
            Vuosittainen kuluvertailu
          </h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vuosiVertailuData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="vuosi" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + ' €'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => euroFormatter(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={`${op1.nimi} vesi`} stackId="op1" fill={VARIT.vesi} name={`${op1.nimi}: vesi`} />
              <Bar dataKey={`${op1.nimi} kiinteistövero`} stackId="op1" fill={VARIT.kiinteisto} name={`${op1.nimi}: kiinteistövero`} />
              <Bar dataKey={`${op1.nimi} muut`} stackId="op1" fill={VARIT.muut} name={`${op1.nimi}: muut`} />
              <Bar dataKey={`${op2.nimi} vesi`} stackId="op2" fill={VARIT.op2} name={`${op2.nimi}: vesi`} opacity={0.8} />
              <Bar dataKey={`${op2.nimi} kiinteistövero`} stackId="op2" fill="#fb923c" name={`${op2.nimi}: kiinteistövero`} opacity={0.8} />
              <Bar dataKey={`${op2.nimi} muut`} stackId="op2" fill="#c4b5fd" name={`${op2.nimi}: muut`} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Saldot vuosittain */}
      {saldoData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3">
            Saldot vuosittain (+ = liikaa maksettu, − = liian vähän)
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={saldoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="vuosi" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + ' €'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => euroFormatter(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={op1.nimi} fill={VARIT.op1} />
              <Bar dataKey={op2.nimi} fill={VARIT.op2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
