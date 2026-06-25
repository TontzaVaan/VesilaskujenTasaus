import type { VuosiData, AppData } from '../types';
import { laskeTasaus, formatEuro, formatPct } from '../utils/calculations';
import Kuvaajat from './Kuvaajat';

interface Props {
  vuosiData: VuosiData;
  appData: AppData;
}


export default function Tasaus({ vuosiData, appData }: Props) {
  const { osapuolet, tontti } = appData;
  const t = laskeTasaus(vuosiData, tontti, osapuolet[0].id, osapuolet[1].id);

  const maksaja = t.tasausErotus > 0
    ? (t.maksajaId === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi)
    : null;
  const saaja = t.tasausErotus > 0
    ? (t.saajaid === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi)
    : null;

  const saldoColor = (s: number) =>
    s > 0 ? 'text-green-700' : s < 0 ? 'text-red-700' : 'text-gray-700';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Vuosittainen tasaus</h2>

      {/* Tasauslaatikko */}
      {t.tasausErotus > 0.005 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="text-lg font-semibold text-amber-900">
            {maksaja} maksaa {saaja}lle
          </div>
          <div className="text-4xl font-bold text-amber-800 mt-1">
            {formatEuro(t.tasausErotus)}
          </div>
          <div className="text-sm text-amber-700 mt-2">
            Erotus: {osapuolet[0].nimi} saldo {formatEuro(t.op1Saldo)} —{' '}
            {osapuolet[1].nimi} saldo {formatEuro(t.op2Saldo)}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="text-lg font-semibold text-green-800">Tasassa! ✓</div>
          <div className="text-sm text-green-700 mt-1">
            Molemmat ovat maksaneet osuutensa oikein.
          </div>
        </div>
      )}

      {/* Saldot */}
      <div className="grid md:grid-cols-2 gap-4">
        {osapuolet.map((op, i) => {
          const saldo = i === 0 ? t.op1Saldo : t.op2Saldo;
          const maksut = i === 0 ? t.op1Maksut : t.op2Maksut;
          const kulut = i === 0 ? t.op1KokonaisKulut : t.op2KokonaisKulut;
          return (
            <div key={op.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">{op.nimi}</h3>
              <table className="text-sm w-full">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Maksettu yhtiölle</td>
                    <td className="py-1.5 text-right font-medium">{formatEuro(maksut)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Vesikulut</td>
                    <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1VesiKulut : t.op2VesiKulut)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Maapohjavero</td>
                    <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1MaapohjaVero : t.op2MaapohjaVero)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">Rakennusverot</td>
                    <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1RakennusVero : t.op2RakennusVero)}</td>
                  </tr>
                  {(t.op1MuutKulut > 0 || t.op2MuutKulut > 0) && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">Muut kulut</td>
                      <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1MuutKulut : t.op2MuutKulut)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200 font-medium">
                    <td className="py-1.5 text-gray-700">Kulut yhteensä</td>
                    <td className="py-1.5 text-right">{formatEuro(kulut)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2 text-gray-700">Saldo</td>
                    <td className={`py-2 text-right text-lg ${saldoColor(saldo)}`}>
                      {saldo > 0 ? '+' : ''}{formatEuro(saldo)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Vesikulutus ja jako */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Vesikulutus ja jako</h3>
        <table className="text-sm w-full max-w-lg">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="pb-1.5 text-left font-medium">Osapuoli</th>
              <th className="pb-1.5 text-right font-medium">Kulutus (m³)</th>
              <th className="pb-1.5 text-right font-medium">Osuus</th>
              <th className="pb-1.5 text-right font-medium">Perusmaksu</th>
              <th className="pb-1.5 text-right font-medium">Käyttömaksu</th>
              <th className="pb-1.5 text-right font-medium">Yhteensä</th>
            </tr>
          </thead>
          <tbody>
            {osapuolet.map((op, i) => {
              const kulutus = i === 0 ? t.op1Kulutus : t.op2Kulutus;
              const pct = i === 0 ? t.op1KulutusPct : t.op2KulutusPct;
              const vesiKulut = i === 0 ? t.op1VesiKulut : t.op2VesiKulut;
              const totalPerusmaksu = vuosiData.vesilaskut.reduce((s, v) => s + v.perusmaksu, 0);
              const totalKayttomaksu = vuosiData.vesilaskut.reduce((s, v) => s + v.kayttomaksu, 0);
              const perusmaksuOsuus = totalPerusmaksu / 2;
              const kayttomaksuOsuus = totalKayttomaksu * pct;
              return (
                <tr key={op.id} className="border-b border-gray-100">
                  <td className="py-1.5">{op.nimi}</td>
                  <td className="py-1.5 text-right">{kulutus} m³</td>
                  <td className="py-1.5 text-right">{formatPct(pct)}</td>
                  <td className="py-1.5 text-right">{formatEuro(perusmaksuOsuus)}</td>
                  <td className="py-1.5 text-right">{formatEuro(kayttomaksuOsuus)}</td>
                  <td className="py-1.5 text-right font-medium">{formatEuro(vesiKulut)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Kiinteistöveron jako */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Kiinteistöveron jako</h3>
        <table className="text-sm w-full max-w-lg">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="pb-1.5 text-left font-medium">Osapuoli</th>
              <th className="pb-1.5 text-right font-medium">Tonttiosuus</th>
              <th className="pb-1.5 text-right font-medium">Maapohja</th>
              <th className="pb-1.5 text-right font-medium">Rakennukset</th>
              <th className="pb-1.5 text-right font-medium">Yhteensä</th>
            </tr>
          </thead>
          <tbody>
            {osapuolet.map((op, i) => (
              <tr key={op.id} className="border-b border-gray-100">
                <td className="py-1.5">{op.nimi}</td>
                <td className="py-1.5 text-right">{formatPct(i === 0 ? t.op1TonttiPct : t.op2TonttiPct)}</td>
                <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1MaapohjaVero : t.op2MaapohjaVero)}</td>
                <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1RakennusVero : t.op2RakennusVero)}</td>
                <td className="py-1.5 text-right font-medium">
                  {formatEuro((i === 0 ? t.op1MaapohjaVero : t.op2MaapohjaVero) + (i === 0 ? t.op1RakennusVero : t.op2RakennusVero))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Kuvaajat vuosiData={vuosiData} appData={appData} />
    </div>
  );
}
