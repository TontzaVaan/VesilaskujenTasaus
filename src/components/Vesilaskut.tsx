import type { Vesilasku } from '../types';
import { KUUKAUDET, formatEuro } from '../utils/calculations';

interface Props {
  vesilaskut: Vesilasku[];
  onChange: (vesilaskut: Vesilasku[]) => void;
}

export default function Vesilaskut({ vesilaskut, onChange }: Props) {
  const paivita = (
    kuukausi: number,
    kentta: keyof Vesilasku,
    arvo: string | number
  ) => {
    onChange(
      vesilaskut.map((v) =>
        v.kuukausi === kuukausi ? { ...v, [kentta]: arvo } : v
      )
    );
  };

  const totalPerusmaksu = vesilaskut.reduce((s, v) => s + v.perusmaksu, 0);
  const totalKayttomaksu = vesilaskut.reduce((s, v) => s + v.kayttomaksu, 0);
  const totalYhteensa = totalPerusmaksu + totalKayttomaksu;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Vesilaskut</h2>

      <div className="flex gap-6 mb-4">
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-gray-500">Perusmaksut yht: </span>
          <span className="font-semibold text-blue-800">{formatEuro(totalPerusmaksu)}</span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-gray-500">Käyttömaksut yht: </span>
          <span className="font-semibold text-blue-800">{formatEuro(totalKayttomaksu)}</span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-gray-500">Yhteensä: </span>
          <span className="font-semibold text-blue-800">{formatEuro(totalYhteensa)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium w-20">Kk</th>
              <th className="pb-2 pr-3 font-medium">Eräpäivä</th>
              <th className="pb-2 pr-3 font-medium text-right">Perusmaksu €</th>
              <th className="pb-2 pr-3 font-medium text-right">Käyttömaksu €</th>
              <th className="pb-2 pr-3 font-medium text-right">Yhteensä €</th>
              <th className="pb-2 font-medium">Kommentti</th>
            </tr>
          </thead>
          <tbody>
            {vesilaskut.map((v) => (
              <tr
                key={v.kuukausi}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-1.5 pr-3 font-medium text-gray-700">
                  {KUUKAUDET[v.kuukausi - 1]}
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="date"
                    value={v.erapaiva}
                    onChange={(e) => paivita(v.kuukausi, 'erapaiva', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 w-36"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="number"
                    value={v.perusmaksu || ''}
                    onChange={(e) =>
                      paivita(v.kuukausi, 'perusmaksu', parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    className="border border-gray-200 rounded px-2 py-1 w-28 text-right"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="number"
                    value={v.kayttomaksu || ''}
                    onChange={(e) =>
                      paivita(v.kuukausi, 'kayttomaksu', parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    className="border border-gray-200 rounded px-2 py-1 w-28 text-right"
                  />
                </td>
                <td className="py-1.5 pr-3 text-right font-medium text-gray-700">
                  {formatEuro(v.perusmaksu + v.kayttomaksu)}
                </td>
                <td className="py-1.5">
                  <input
                    type="text"
                    value={v.kommentti}
                    onChange={(e) => paivita(v.kuukausi, 'kommentti', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 w-full min-w-40"
                    placeholder="Kommentti"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
              <td className="py-2 pr-3 text-gray-700">Yhteensä</td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalPerusmaksu)}</td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalKayttomaksu)}</td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalYhteensa)}</td>
              <td className="py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
