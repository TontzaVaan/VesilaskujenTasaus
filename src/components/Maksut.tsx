import type { Maksu, Osapuoli } from '../types';
import { formatEuro } from '../utils/calculations';

function uusiMaksu(osapuoliId: string): Maksu {
  return {
    id: crypto.randomUUID(),
    paiva: new Date().toISOString().slice(0, 10),
    osapuoliId,
    maara: 0,
    kommentti: '',
  };
}

interface Props {
  maksut: Maksu[];
  osapuolet: [Osapuoli, Osapuoli];
  onChange: (maksut: Maksu[]) => void;
}

export default function Maksut({ maksut, osapuolet, onChange }: Props) {
  const paivita = (id: string, kentta: keyof Maksu, arvo: string | number) => {
    onChange(maksut.map((m) => (m.id === id ? { ...m, [kentta]: arvo } : m)));
  };

  const poista = (id: string) => onChange(maksut.filter((m) => m.id !== id));

  const lisaa = (osapuoliId: string) =>
    onChange([...maksut, uusiMaksu(osapuoliId)]);

  const op1Sum = maksut.filter(m => m.osapuoliId === osapuolet[0].id).reduce((s, m) => s + m.maara, 0);
  const op2Sum = maksut.filter(m => m.osapuoliId === osapuolet[1].id).reduce((s, m) => s + m.maara, 0);

  const sorted = [...maksut].sort((a, b) => a.paiva.localeCompare(b.paiva));

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Osakeyhtiön tilille maksetut summat
      </h2>

      <div className="flex gap-6 mb-4">
        {osapuolet.map((op) => (
          <div key={op.id} className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-500">{op.nimi} yhteensä: </span>
            <span className="font-semibold text-blue-800">
              {formatEuro(op.id === osapuolet[0].id ? op1Sum : op2Sum)}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium">Päivämäärä</th>
              <th className="pb-2 pr-3 font-medium">Osapuoli</th>
              <th className="pb-2 pr-3 font-medium">Summa €</th>
              <th className="pb-2 pr-3 font-medium">Kommentti</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 pr-3">
                  <input
                    type="date"
                    value={m.paiva}
                    onChange={(e) => paivita(m.id, 'paiva', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 w-36"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <select
                    value={m.osapuoliId}
                    onChange={(e) => paivita(m.id, 'osapuoliId', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1"
                  >
                    {osapuolet.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nimi}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="number"
                    value={m.maara || ''}
                    onChange={(e) => paivita(m.id, 'maara', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="border border-gray-200 rounded px-2 py-1 w-28 text-right"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="text"
                    value={m.kommentti}
                    onChange={(e) => paivita(m.id, 'kommentti', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 w-full min-w-40"
                    placeholder="Kommentti"
                  />
                </td>
                <td className="py-1.5">
                  <button
                    onClick={() => poista(m.id)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    title="Poista"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3">
        {osapuolet.map((op) => (
          <button
            key={op.id}
            onClick={() => lisaa(op.id)}
            className="text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded px-3 py-1.5"
          >
            + Lisää maksu ({op.nimi})
          </button>
        ))}
      </div>
    </div>
  );
}
