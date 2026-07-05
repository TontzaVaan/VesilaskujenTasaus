import type { AppData } from '../types';
import { laskeTasaus, formatEuro } from '../utils/calculations';

interface Props {
  appData: AppData;
}

export default function Historia({ appData }: Props) {
  const { osapuolet, tontti, vuodet } = appData;

  const vuosiRivit = [...vuodet]
    .sort((a, b) => b.vuosi - a.vuosi)
    .map((v) => {
      const t = laskeTasaus(v, tontti, osapuolet[0].id, osapuolet[1].id);
      const maksajaId = t.maksajaId;
      const maksaja = maksajaId === osapuolet[0].id ? osapuolet[0].nimi : osapuolet[1].nimi;
      const saaja = maksajaId === osapuolet[0].id ? osapuolet[1].nimi : osapuolet[0].nimi;
      return { v, t, maksaja, saaja };
    });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Historia</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Vuosi</th>
              <th className="pb-2 pr-4 font-medium text-right">
                {osapuolet[0].nimi} maksut
              </th>
              <th className="pb-2 pr-4 font-medium text-right">
                {osapuolet[1].nimi} maksut
              </th>
              <th className="pb-2 pr-4 font-medium text-right">Vesikulut yht.</th>
              <th className="pb-2 pr-4 font-medium text-right">Kiinteistövero yht.</th>
              <th className="pb-2 pr-4 font-medium text-right">
                {osapuolet[0].nimi} saldo
              </th>
              <th className="pb-2 pr-4 font-medium text-right">
                {osapuolet[1].nimi} saldo
              </th>
              <th className="pb-2 font-medium">Tasaus</th>
            </tr>
          </thead>
          <tbody>
            {vuosiRivit.map(({ v, t, maksaja, saaja }) => {
              const vesiYht = t.op1VesiKulut + t.op2VesiKulut;
              const kiintYht =
                t.op1MaapohjaVero +
                t.op2MaapohjaVero +
                t.op1RakennusVero +
                t.op2RakennusVero;
              return (
                <tr
                  key={v.vuosi}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2.5 pr-4 font-semibold text-gray-700">
                    {v.vuosi}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    {formatEuro(t.op1Maksut)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    {formatEuro(t.op2Maksut)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    {formatEuro(vesiYht)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    {formatEuro(kiintYht)}
                  </td>
                  <td
                    className={`py-2.5 pr-4 text-right font-medium ${
                      t.op1Saldo >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {t.op1Saldo >= 0 ? '+' : ''}
                    {formatEuro(t.op1Saldo)}
                  </td>
                  <td
                    className={`py-2.5 pr-4 text-right font-medium ${
                      t.op2Saldo >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {t.op2Saldo >= 0 ? '+' : ''}
                    {formatEuro(t.op2Saldo)}
                  </td>
                  <td className="py-2.5">
                    {t.tasausErotus > 0.005 ? (
                      <span className="text-amber-700 font-medium">
                        {maksaja} → {saaja}: {formatEuro(t.tasausErotus)}
                      </span>
                    ) : (
                      <span className="text-green-700">Tasassa</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
