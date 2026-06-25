import React from 'react';
import type { MuuKulu, Osapuoli } from '../types';
import { formatEuro } from '../utils/calculations';
import Liitteet from './Liitteet';

function uusiKulu(): MuuKulu {
  return {
    id: crypto.randomUUID(),
    kuvaus: '',
    paiva: new Date().toISOString().slice(0, 10),
    yhteensa: 0,
    op1Prosentti: 50,
  };
}

interface Props {
  muutKulut: MuuKulu[];
  osapuolet: [Osapuoli, Osapuoli];
  lukittu?: boolean;
  onChange: (muutKulut: MuuKulu[]) => void;
}

export default function MuutKulut({ muutKulut, osapuolet, lukittu, onChange }: Props) {
  const paivita = (id: string, kentta: keyof MuuKulu, arvo: string | number | string[]) => {
    onChange(muutKulut.map((k) => (k.id === id ? { ...k, [kentta]: arvo } : k)));
  };

  const poista = (id: string) => onChange(muutKulut.filter((k) => k.id !== id));

  const op1Sum = muutKulut.reduce((s, k) => s + k.yhteensa * (k.op1Prosentti / 100), 0);
  const op2Sum = muutKulut.reduce((s, k) => s + k.yhteensa * ((100 - k.op1Prosentti) / 100), 0);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Muut yhteiset kulut</h2>

      {muutKulut.length > 0 && (
        <>
          <div className="flex gap-6 mb-4">
            {osapuolet.map((op, i) => (
              <div key={op.id} className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-500">{op.nimi} osuus yht: </span>
                <span className="font-semibold text-blue-800">
                  {formatEuro(i === 0 ? op1Sum : op2Sum)}
                </span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Kuvaus</th>
                  <th className="pb-2 pr-3 font-medium">Päivämäärä</th>
                  <th className="pb-2 pr-3 font-medium text-right">Yhteensä €</th>
                  <th className="pb-2 pr-3 font-medium text-center">
                    {osapuolet[0].nimi} %
                  </th>
                  <th className="pb-2 pr-3 font-medium text-right">
                    {osapuolet[0].nimi} €
                  </th>
                  <th className="pb-2 pr-3 font-medium text-right">
                    {osapuolet[1].nimi} €
                  </th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {muutKulut.map((k) => {
                  const op1Eur = k.yhteensa * (k.op1Prosentti / 100);
                  const op2Eur = k.yhteensa * ((100 - k.op1Prosentti) / 100);
                  return (
                    <React.Fragment key={k.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 pr-3">
                        <input
                          type="text"
                          value={k.kuvaus}
                          onChange={(e) => paivita(k.id, 'kuvaus', e.target.value)}
                          disabled={lukittu}
                          className="border border-gray-200 rounded px-2 py-1 w-44 disabled:bg-gray-50 disabled:text-gray-500"
                          placeholder="esim. Vakuutus"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="date"
                          value={k.paiva}
                          onChange={(e) => paivita(k.id, 'paiva', e.target.value)}
                          disabled={lukittu}
                          className="border border-gray-200 rounded px-2 py-1 w-36 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number"
                          value={k.yhteensa || ''}
                          onChange={(e) => paivita(k.id, 'yhteensa', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          disabled={lukittu}
                          className="border border-gray-200 rounded px-2 py-1 w-28 text-right disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-center">
                        <input
                          type="number"
                          value={k.op1Prosentti}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                            paivita(k.id, 'op1Prosentti', v);
                          }}
                          min={0}
                          max={100}
                          step="1"
                          disabled={lukittu}
                          className="border border-gray-200 rounded px-2 py-1 w-16 text-center disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-right text-gray-600">
                        {formatEuro(op1Eur)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-gray-600">
                        {formatEuro(op2Eur)}
                      </td>
                      {!lukittu && (
                        <td className="py-1.5">
                          <button
                            onClick={() => poista(k.id)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td colSpan={lukittu ? 6 : 7} className="pb-2 pl-2">
                        <Liitteet
                          liiteIds={k.liitteet ?? []}
                          onChange={(ids) => paivita(k.id, 'liitteet', ids)}
                          label="Lisää liite"
                        />
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!lukittu && (
        <button
          onClick={() => onChange([...muutKulut, uusiKulu()])}
          className="text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded px-3 py-1.5"
        >
          + Lisää muu kulu
        </button>
      )}
    </div>
  );
}
