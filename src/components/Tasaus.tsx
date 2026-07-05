import { useRef } from 'react';
import type { VuosiData, AppData } from '../types';
import { laskeTasaus, tunnistaDublikaatit, formatEuro, formatPct, KUUKAUDET } from '../utils/calculations';
import Kuvaajat from './Kuvaajat';

interface Props {
  vuosiData: VuosiData;
  appData: AppData;
  dublikaattiKuukaudet?: Set<number>;
}


export default function Tasaus({ vuosiData, appData, dublikaattiKuukaudet }: Props) {
  const { osapuolet, tontti } = appData;
  const t = laskeTasaus(vuosiData, tontti, osapuolet[0].id, osapuolet[1].id, dublikaattiKuukaudet);
  const printRef = useRef<HTMLDivElement>(null);

  const tulostaaPDF = () => {
    const el = printRef.current;
    if (!el) return;
    const orig = document.title;
    document.title = `Tasaus-${vuosiData.vuosi}`;
    window.print();
    document.title = orig;
  };

  const maksaja = t.tasausErotus > 0
    ? (t.maksajaId === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi)
    : null;
  const saaja = t.tasausErotus > 0
    ? (t.saajaid === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi)
    : null;

  const saldoColor = (s: number) =>
    s > 0 ? 'text-green-700' : s < 0 ? 'text-red-700' : 'text-gray-700';

  // Last 5 years (excluding current) for comparison
  const vertailuVuodet = [...appData.vuodet]
    .filter((v) => v.vuosi < vuosiData.vuosi)
    .sort((a, b) => b.vuosi - a.vuosi)
    .slice(0, 5)
    .reverse();

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Vuosittainen tasaus {vuosiData.vuosi}</h2>
        <button
          onClick={tulostaaPDF}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 print:hidden"
          title="Tulosta / tallenna PDF"
        >
          ↓ PDF
        </button>
      </div>

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
              {t.op1JaettuTonttivero > 0 && <th className="pb-1.5 text-right font-medium">Keskipelto</th>}
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
                {t.op1JaettuTonttivero > 0 && (
                  <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1JaettuTonttivero : t.op2JaettuTonttivero)}</td>
                )}
                <td className="py-1.5 text-right">{formatEuro(i === 0 ? t.op1RakennusVero : t.op2RakennusVero)}</td>
                <td className="py-1.5 text-right font-medium">
                  {formatEuro(
                    (i === 0 ? t.op1MaapohjaVero : t.op2MaapohjaVero) +
                    (i === 0 ? t.op1JaettuTonttivero : t.op2JaettuTonttivero) +
                    (i === 0 ? t.op1RakennusVero : t.op2RakennusVero)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kiinteistöveron erittely */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Kiinteistöveron erittely</h3>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-1.5 text-left font-medium">Erä</th>
                <th className="pb-1.5 text-right font-medium">Yhteensä</th>
                <th className="pb-1.5 text-right font-medium">{osapuolet[0].nimi}</th>
                <th className="pb-1.5 text-right font-medium">{osapuolet[1].nimi}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5">Maapohja ({formatPct(t.op1TonttiPct)} / {formatPct(t.op2TonttiPct)})</td>
                <td className="py-1.5 text-right">{formatEuro(vuosiData.kiinteistoveroTontti.maapohjaVero)}</td>
                <td className="py-1.5 text-right">{formatEuro(t.op1MaapohjaVero)}</td>
                <td className="py-1.5 text-right">{formatEuro(t.op2MaapohjaVero)}</td>
              </tr>
              {t.op1JaettuTonttivero > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5">Keskipelto (50 % / 50 %)</td>
                  <td className="py-1.5 text-right">{formatEuro((vuosiData.kiinteistoveroTontti.jaettuTonttivero ?? 0))}</td>
                  <td className="py-1.5 text-right">{formatEuro(t.op1JaettuTonttivero)}</td>
                  <td className="py-1.5 text-right">{formatEuro(t.op2JaettuTonttivero)}</td>
                </tr>
              )}
              {vuosiData.rakennusverot.map((r) => {
                const omistaja = r.omistajaId === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi;
                const isOp1 = r.omistajaId === osapuolet[0].id;
                return (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-1.5">{r.nimi || 'Rakennus'} (100% {omistaja})</td>
                    <td className="py-1.5 text-right">{formatEuro(r.maara)}</td>
                    <td className="py-1.5 text-right">{isOp1 ? formatEuro(r.maara) : '–'}</td>
                    <td className="py-1.5 text-right">{isOp1 ? '–' : formatEuro(r.maara)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-gray-300 font-semibold">
                <td className="py-1.5">Yhteensä</td>
                <td className="py-1.5 text-right">{formatEuro(t.op1MaapohjaVero + t.op2MaapohjaVero + t.op1JaettuTonttivero + t.op2JaettuTonttivero + t.op1RakennusVero + t.op2RakennusVero)}</td>
                <td className="py-1.5 text-right">{formatEuro(t.op1MaapohjaVero + t.op1JaettuTonttivero + t.op1RakennusVero)}</td>
                <td className="py-1.5 text-right">{formatEuro(t.op2MaapohjaVero + t.op2JaettuTonttivero + t.op2RakennusVero)}</td>
              </tr>
            </tbody>
          </table>
          {(() => {
            const total = vuosiData.kiinteistoveroTontti.maapohjaVero + (vuosiData.kiinteistoveroTontti.jaettuTonttivero ?? 0) + vuosiData.rakennusverot.reduce((s, r) => s + r.maara, 0);
            const sum = t.op1MaapohjaVero + t.op2MaapohjaVero + t.op1JaettuTonttivero + t.op2JaettuTonttivero + t.op1RakennusVero + t.op2RakennusVero;
            const ok = Math.abs(total - sum) < 0.02;
            return (
              <div className={`mt-2 text-xs ${ok ? 'text-green-700' : 'text-red-600'}`}>
                {ok ? '✓ Tarkistus: summat täsmäävät' : `⚠ Tarkistus: eroa ${formatEuro(Math.abs(total - sum))}`}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Vesilaskujen tilanne */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Vesilaskujen tilanne</h3>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-1.5 text-left font-medium">Kuukausi</th>
                <th className="pb-1.5 text-right font-medium">Perusmaksu</th>
                <th className="pb-1.5 text-right font-medium">Käyttömaksu</th>
                <th className="pb-1.5 text-left font-medium pl-3">Tila</th>
              </tr>
            </thead>
            <tbody>
              {KUUKAUDET.map((kk, idx) => {
                const kuukausi = idx + 1;
                const v = vuosiData.vesilaskut.find((x) => x.kuukausi === kuukausi);
                const isDuplikaatti = dublikaattiKuukaudet?.has(kuukausi);
                const kirjattu = v && (v.perusmaksu > 0 || v.kayttomaksu > 0);
                return (
                  <tr key={kuukausi} className={`border-b border-gray-100 ${isDuplikaatti ? 'bg-amber-50' : ''}`}>
                    <td className="py-1.5">{kk}</td>
                    <td className={`py-1.5 text-right ${isDuplikaatti ? 'line-through text-gray-400' : ''}`}>
                      {kirjattu ? formatEuro(v!.perusmaksu) : '–'}
                    </td>
                    <td className={`py-1.5 text-right ${isDuplikaatti ? 'line-through text-gray-400' : ''}`}>
                      {kirjattu ? formatEuro(v!.kayttomaksu) : '–'}
                    </td>
                    <td className="py-1.5 pl-3">
                      {isDuplikaatti
                        ? <span className="text-amber-700 text-xs">⊘ duplikaatti</span>
                        : kirjattu
                        ? <span className="text-green-700 text-xs">✓ kirjattu</span>
                        : <span className="text-gray-400 text-xs">⚠ puuttuu</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 font-semibold">
                <td className="py-1.5">Yhteensä</td>
                <td className="py-1.5 text-right">{formatEuro(vuosiData.vesilaskut.filter(v => !dublikaattiKuukaudet?.has(v.kuukausi)).reduce((s, v) => s + v.perusmaksu, 0))}</td>
                <td className="py-1.5 text-right">{formatEuro(vuosiData.vesilaskut.filter(v => !dublikaattiKuukaudet?.has(v.kuukausi)).reduce((s, v) => s + v.kayttomaksu, 0))}</td>
                <td className="py-1.5 pl-3 text-xs text-gray-500">
                  {vuosiData.vesilaskut.filter(v => (v.perusmaksu > 0 || v.kayttomaksu > 0) && !dublikaattiKuukaudet?.has(v.kuukausi)).length}/12 kirjattu
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {/* Vertailu edellisiin vuosiin */}
      {vertailuVuodet.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Vertailu – viimeiset {vertailuVuodet.length} vuotta</h3>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-1.5 text-left font-medium">Vuosi</th>
                  <th className="pb-1.5 text-right font-medium">{osapuolet[0].nimi} maksut</th>
                  <th className="pb-1.5 text-right font-medium">{osapuolet[1].nimi} maksut</th>
                  <th className="pb-1.5 text-right font-medium">Vesi yht.</th>
                  <th className="pb-1.5 text-right font-medium">Kiinteistövero yht.</th>
                  <th className="pb-1.5 text-right font-medium">Muut kulut</th>
                  <th className="pb-1.5 text-right font-medium">{osapuolet[0].nimi} saldo</th>
                  <th className="pb-1.5 text-right font-medium">{osapuolet[1].nimi} saldo</th>
                  <th className="pb-1.5 text-right font-medium">Tasaus €</th>
                  <th className="pb-1.5 text-left font-medium pl-2">Maksaja</th>
                </tr>
              </thead>
              <tbody>
                {[...vertailuVuodet, vuosiData].map((v) => {
                  const edVuosi = appData.vuodet.find((av) => av.vuosi === v.vuosi - 1) ?? null;
                  const dubKuukaudet = tunnistaDublikaatit(v, edVuosi);
                  const tv = laskeTasaus(v, tontti, osapuolet[0].id, osapuolet[1].id, dubKuukaudet);
                  const isCurrentYear = v.vuosi === vuosiData.vuosi;
                  const maks = tv.tasausErotus > 0.005
                    ? (tv.maksajaId === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi)
                    : '–';
                  return (
                    <tr
                      key={v.vuosi}
                      className={`border-b border-gray-100 ${isCurrentYear ? 'font-semibold bg-blue-50' : ''}`}
                    >
                      <td className="py-1.5">{v.vuosi}{isCurrentYear && ' ★'}</td>
                      <td className="py-1.5 text-right">{formatEuro(tv.op1Maksut)}</td>
                      <td className="py-1.5 text-right">{formatEuro(tv.op2Maksut)}</td>
                      <td className="py-1.5 text-right">{formatEuro(tv.op1VesiKulut + tv.op2VesiKulut)}</td>
                      <td className="py-1.5 text-right">{formatEuro(tv.op1MaapohjaVero + tv.op2MaapohjaVero + tv.op1RakennusVero + tv.op2RakennusVero)}</td>
                      <td className="py-1.5 text-right">{formatEuro(tv.op1MuutKulut + tv.op2MuutKulut)}</td>
                      <td className={`py-1.5 text-right ${tv.op1Saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {tv.op1Saldo > 0 ? '+' : ''}{formatEuro(tv.op1Saldo)}
                      </td>
                      <td className={`py-1.5 text-right ${tv.op2Saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {tv.op2Saldo > 0 ? '+' : ''}{formatEuro(tv.op2Saldo)}
                      </td>
                      <td className="py-1.5 text-right">{tv.tasausErotus > 0.005 ? formatEuro(tv.tasausErotus) : '–'}</td>
                      <td className="py-1.5 pl-2">{maks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Kuvaajat vuosiData={vuosiData} appData={appData} />
    </div>
  );
}
