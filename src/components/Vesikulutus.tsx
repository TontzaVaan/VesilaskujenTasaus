import type { Mittarit, Osapuoli } from '../types';
import { formatPct } from '../utils/calculations';

interface Props {
  mittarit: Mittarit;
  osapuolet: [Osapuoli, Osapuoli];
  onChange: (mittarit: Mittarit) => void;
}

export default function Vesikulutus({ mittarit, osapuolet, onChange }: Props) {
  const { yhteinen, alamittari } = mittarit;

  const yhteinenKulutus = yhteinen.loppuLukema - yhteinen.alkuLukema;
  const op1Kulutus = alamittari.loppuLukema - alamittari.alkuLukema;
  const op2Kulutus = Math.max(0, yhteinenKulutus - op1Kulutus);
  const total = op1Kulutus + op2Kulutus;
  const op1Pct = total > 0 ? op1Kulutus / total : 0.5;
  const op2Pct = total > 0 ? op2Kulutus / total : 0.5;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Vesikulutus</h2>
      <p className="text-sm text-gray-500 mb-6">
        Yhteinen päämittari mittaa koko kiinteistön vedenkulutuksen.{' '}
        {osapuolet[0].nimi}n alamittari mittaa {osapuolet[0].nimi}n kulutuksen.{' '}
        {osapuolet[1].nimi}n kulutus = Yhteinen − {osapuolet[0].nimi}.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Yhteinen mittari */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Yhteinen päämittari</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aloituspäivämäärä</label>
              <input
                type="date"
                value={yhteinen.alkuPvm}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, alkuPvm: e.target.value } })
                }
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm"
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
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right"
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
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lopetuslukemat (m³)</label>
              <input
                type="number"
                value={yhteinen.loppuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, yhteinen: { ...yhteinen, loppuLukema: parseFloat(e.target.value) || 0 } })
                }
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Yhteiskulutus: </span>
            <span className="font-semibold">{yhteinenKulutus} m³</span>
          </div>
        </div>

        {/* Osapuoli 1 alamittari */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">
            {osapuolet[0].nimi}n alamittari
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
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm"
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
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right"
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
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lopetuslukemat (m³)</label>
              <input
                type="number"
                value={alamittari.loppuLukema || ''}
                onChange={(e) =>
                  onChange({ ...mittarit, alamittari: { ...alamittari, loppuLukema: parseFloat(e.target.value) || 0 } })
                }
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm text-right"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{osapuolet[0].nimi}n kulutus: </span>
            <span className="font-semibold">{op1Kulutus} m³</span>
          </div>
        </div>
      </div>

      {/* Kulutusyhteenveto */}
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
              <td className="py-1.5">{osapuolet[0].nimi}</td>
              <td className="py-1.5 text-right">{op1Kulutus}</td>
              <td className="py-1.5 text-right">{formatPct(op1Pct)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1.5">{osapuolet[1].nimi}</td>
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
