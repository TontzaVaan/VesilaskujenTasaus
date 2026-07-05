import type { Mittarit, Osapuoli, VesimittariLukema } from '../types';
import { formatPct, laskeVuosikulutus } from '../utils/calculations';

interface Props {
  vuosi: number;
  mittarit: Mittarit;
  vesimittarit: VesimittariLukema[];
  osapuolet: [Osapuoli, Osapuoli];
  lukittu?: boolean;
  onChange: (mittarit: Mittarit) => void;
  onAsetuksetClick?: () => void;
}

export default function Vesikulutus({ vuosi, mittarit, vesimittarit, osapuolet, lukittu, onChange, onAsetuksetClick }: Props) {
  const globalKulutus = laskeVuosikulutus(vuosi, vesimittarit);

  // op1 = Pakarinen (alamittari), op2 = Pusa (päämittari)
  const op1Nimi = osapuolet[0].nimi;
  const op2Nimi = osapuolet[1].nimi;

  if (globalKulutus) {
    const op1Kulutus = globalKulutus.pakarinenKulutus;
    const op2Kulutus = globalKulutus.pusaKulutus;
    const total = op1Kulutus + op2Kulutus;
    const op1Pct = total > 0 ? op1Kulutus / total : 0.5;
    const op2Pct = total > 0 ? op2Kulutus / total : 0.5;

    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Vesikulutus</h2>
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800 flex items-center justify-between">
          <span>Lukemat haettu asetuksista (Joulukuu {vuosi - 1} → Joulukuu {vuosi})</span>
          {onAsetuksetClick && (
            <button onClick={onAsetuksetClick} className="text-xs underline hover:no-underline ml-2">
              Muokkaa asetuksissa →
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3">{op2Nimi} (päämittari)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Alkulukema (Joulu {vuosi - 1})</span>
                <span className="font-mono">{globalKulutus.pusaAlku} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loppulukema (Joulu {vuosi})</span>
                <span className="font-mono">{globalKulutus.pusaLoppu} m³</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                <span>Kokonaiskulutus</span>
                <span>{globalKulutus.pusaLoppu - globalKulutus.pusaAlku} m³</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3">{op1Nimi} (alamittari)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Alkulukema (Joulu {vuosi - 1})</span>
                <span className="font-mono">{globalKulutus.pakarinenAlku} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loppulukema (Joulu {vuosi})</span>
                <span className="font-mono">{globalKulutus.pakarinenLoppu} m³</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                <span>{op1Nimi}n kulutus</span>
                <span>{op1Kulutus} m³</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Kulutusjakauma</h3>
          <table className="text-sm w-full max-w-md">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1.5 font-medium">Osapuoli</th>
                <th className="text-right pb-1.5 font-medium">Kulutus (m³)</th>
                <th className="text-right pb-1.5 font-medium">Osuus (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5">{op1Nimi}</td>
                <td className="py-1.5 text-right">{op1Kulutus}</td>
                <td className="py-1.5 text-right">{formatPct(op1Pct)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5">{op2Nimi}</td>
                <td className="py-1.5 text-right">{op2Kulutus}</td>
                <td className="py-1.5 text-right">{formatPct(op2Pct)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-1.5">Yhteensä</td>
                <td className="py-1.5 text-right">{total}</td>
                <td className="py-1.5 text-right">100,0 %</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback: editable per-year mittarit
  const { yhteinen, alamittari } = mittarit;
  const yhteinenKulutus = yhteinen.loppuLukema - yhteinen.alkuLukema;
  const op1Kulutus = alamittari.loppuLukema - alamittari.alkuLukema;
  const op2Kulutus = Math.max(0, yhteinenKulutus - op1Kulutus);
  const total = op1Kulutus + op2Kulutus;
  const op1Pct = total > 0 ? op1Kulutus / total : 0.5;
  const op2Pct = total > 0 ? op2Kulutus / total : 0.5;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Vesikulutus</h2>
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
        <span>⚠ Lisää vuosien {vuosi - 1} ja {vuosi} mittarilukemat Asetuksissa tarkempaa laskentaa varten.</span>
        {onAsetuksetClick && (
          <button onClick={onAsetuksetClick} className="text-xs underline hover:no-underline ml-2">
            Asetuksiin →
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {op2Nimi}n päämittari mittaa koko kiinteistön vedenkulutuksen.{' '}
        {op1Nimi}n alamittari mittaa {op1Nimi}n kulutuksen.{' '}
        {op2Nimi}n kulutus = Yhteinen − {op1Nimi}.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">{op2Nimi} (päämittari)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aloituspäivämäärä</label>
              <input
                type="date"
                value={yhteinen.alkuPvm}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, alkuPvm: e.target.value } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aloituslukema (m³)</label>
              <input
                type="number"
                value={yhteinen.alkuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, alkuLukema: parseFloat(e.target.value) || 0 } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lopetuspäivämäärä</label>
              <input
                type="date"
                value={yhteinen.loppuPvm}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, loppuPvm: e.target.value } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loppulukema (m³)</label>
              <input
                type="number"
                value={yhteinen.loppuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, loppuLukema: parseFloat(e.target.value) || 0 } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Yhteiskulutus: </span>
            <span className="font-semibold">{yhteinenKulutus} m³</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">
            {op1Nimi} (alamittari)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aloituspäivämäärä</label>
              <input
                type="date"
                value={alamittari.alkuPvm}
                onChange={(e) =>
                  onChange({ ...mittarit, alamittari: { ...alamittari, alkuPvm: e.target.value } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aloituslukema (m³)</label>
              <input
                type="number"
                value={alamittari.alkuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, alamittari: { ...alamittari, alkuLukema: parseFloat(e.target.value) || 0 } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lopetuspäivämäärä</label>
              <input
                type="date"
                value={alamittari.loppuPvm}
                onChange={(e) =>
                  onChange({ ...mittarit, alamittari: { ...alamittari, loppuPvm: e.target.value } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loppulukema (m³)</label>
              <input
                type="number"
                value={alamittari.loppuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, alamittari: { ...alamittari, loppuLukema: parseFloat(e.target.value) || 0 } })
                }
                disabled={lukittu}
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{op1Nimi}n kulutus: </span>
            <span className="font-semibold">{op1Kulutus} m³</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-3">Kulutusjakauma</h3>
        <table className="text-sm w-full max-w-md">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="text-left pb-1.5 font-medium">Osapuoli</th>
              <th className="text-right pb-1.5 font-medium">Kulutus (m³)</th>
              <th className="text-right pb-1.5 font-medium">Osuus (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1.5">{op1Nimi}</td>
              <td className="py-1.5 text-right">{op1Kulutus}</td>
              <td className="py-1.5 text-right">{formatPct(op1Pct)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1.5">{op2Nimi}</td>
              <td className="py-1.5 text-right">{op2Kulutus}</td>
              <td className="py-1.5 text-right">{formatPct(op2Pct)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1.5">Yhteensä</td>
              <td className="py-1.5 text-right">{yhteinenKulutus}</td>
              <td className="py-1.5 text-right">100,0 %</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
