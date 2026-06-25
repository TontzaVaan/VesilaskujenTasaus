import type { KiinteistoveroTontti, RakennusVero, Osapuoli, Tontti } from '../types';
import { formatEuro, formatPct } from '../utils/calculations';

function uusiRakennusvero(omistajaId: string): RakennusVero {
  return { id: crypto.randomUUID(), nimi: '', omistajaId, maara: 0 };
}

interface Props {
  kiinteistoveroTontti: KiinteistoveroTontti;
  rakennusverot: RakennusVero[];
  osapuolet: [Osapuoli, Osapuoli];
  tontti: Tontti;
  onChange: (tontti: KiinteistoveroTontti, rakennusverot: RakennusVero[]) => void;
}

export default function Kiinteistovero({
  kiinteistoveroTontti,
  rakennusverot,
  osapuolet,
  tontti,
  onChange,
}: Props) {
  const kokonaisNelio = tontti.op1Neliometrit + tontti.op2Neliometrit;
  const op1Pct = kokonaisNelio > 0 ? tontti.op1Neliometrit / kokonaisNelio : 0.5;
  const op2Pct = kokonaisNelio > 0 ? tontti.op2Neliometrit / kokonaisNelio : 0.5;

  const op1MaapohjaVero = kiinteistoveroTontti.maapohjaVero * op1Pct;
  const op2MaapohjaVero = kiinteistoveroTontti.maapohjaVero * op2Pct;

  const paivitaRakennus = (id: string, kentta: keyof RakennusVero, arvo: string | number) => {
    onChange(
      kiinteistoveroTontti,
      rakennusverot.map((r) => (r.id === id ? { ...r, [kentta]: arvo } : r))
    );
  };

  const poistaRakennus = (id: string) =>
    onChange(kiinteistoveroTontti, rakennusverot.filter((r) => r.id !== id));

  const lisaaRakennus = (omistajaId: string) =>
    onChange(kiinteistoveroTontti, [...rakennusverot, uusiRakennusvero(omistajaId)]);

  const op1RakennusVero = rakennusverot
    .filter((r) => r.omistajaId === osapuolet[0].id)
    .reduce((s, r) => s + r.maara, 0);
  const op2RakennusVero = rakennusverot
    .filter((r) => r.omistajaId === osapuolet[1].id)
    .reduce((s, r) => s + r.maara, 0);

  return (
    <div className="space-y-6">
      {/* Tontti / Maapohja */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Kiinteistövero</h2>
        <h3 className="font-medium text-gray-700 mb-3">Tontti (maapohjavero)</h3>

        {kokonaisNelio === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
            Tontin neliömäärät on asetettu nollaksi. Määritä ne Asetuksista (jako lasketaan tasan).
          </div>
        )}

        <div className="flex items-end gap-6 flex-wrap mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Maapohjavero yhteensä €
            </label>
            <input
              type="number"
              value={kiinteistoveroTontti.maapohjaVero || ''}
              onChange={(e) =>
                onChange(
                  { maapohjaVero: parseFloat(e.target.value) || 0 },
                  rakennusverot
                )
              }
              step="0.01"
              className="border border-gray-200 rounded px-3 py-1.5 w-36 text-right"
            />
          </div>
          <div className="text-sm text-gray-500">
            Jako: {osapuolet[0].nimi} {tontti.op1Neliometrit} m² ({formatPct(op1Pct)}) /{' '}
            {osapuolet[1].nimi} {tontti.op2Neliometrit} m² ({formatPct(op2Pct)})
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <table className="text-sm w-full max-w-md">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1.5 font-medium">Osapuoli</th>
                <th className="text-right pb-1.5 font-medium">Osuus</th>
                <th className="text-right pb-1.5 font-medium">Vero €</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5">{osapuolet[0].nimi}</td>
                <td className="py-1.5 text-right">{formatPct(op1Pct)}</td>
                <td className="py-1.5 text-right">{formatEuro(op1MaapohjaVero)}</td>
              </tr>
              <tr>
                <td className="py-1.5">{osapuolet[1].nimi}</td>
                <td className="py-1.5 text-right">{formatPct(op2Pct)}</td>
                <td className="py-1.5 text-right">{formatEuro(op2MaapohjaVero)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rakennukset */}
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Rakennusten kiinteistöverot</h3>
        <p className="text-sm text-gray-500 mb-3">
          Kukin rakennus maksetaan kokonaan sen omistajalle.
        </p>

        {rakennusverot.length > 0 && (
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">Rakennus</th>
                <th className="pb-2 pr-3 font-medium">Omistaja</th>
                <th className="pb-2 pr-3 font-medium text-right">Vero €</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rakennusverot.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 pr-3">
                    <input
                      type="text"
                      value={r.nimi}
                      onChange={(e) => paivitaRakennus(r.id, 'nimi', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 w-40"
                      placeholder="esim. Pakarisen talo"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <select
                      value={r.omistajaId}
                      onChange={(e) => paivitaRakennus(r.id, 'omistajaId', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1"
                    >
                      {osapuolet.map((op) => (
                        <option key={op.id} value={op.id}>{op.nimi}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="number"
                      value={r.maara || ''}
                      onChange={(e) => paivitaRakennus(r.id, 'maara', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="border border-gray-200 rounded px-2 py-1 w-28 text-right"
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      onClick={() => poistaRakennus(r.id)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex gap-2 mb-4">
          {osapuolet.map((op) => (
            <button
              key={op.id}
              onClick={() => lisaaRakennus(op.id)}
              className="text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded px-3 py-1.5"
            >
              + Lisää rakennus ({op.nimi})
            </button>
          ))}
        </div>

        {rakennusverot.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="text-sm w-full max-w-md">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1.5 font-medium">Osapuoli</th>
                  <th className="text-right pb-1.5 font-medium">Rakennusverot yht €</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5">{osapuolet[0].nimi}</td>
                  <td className="py-1.5 text-right">{formatEuro(op1RakennusVero)}</td>
                </tr>
                <tr>
                  <td className="py-1.5">{osapuolet[1].nimi}</td>
                  <td className="py-1.5 text-right">{formatEuro(op2RakennusVero)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
