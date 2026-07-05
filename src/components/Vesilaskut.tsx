import { useState } from 'react';
import type { Vesilasku, Osapuoli } from '../types';
import { KUUKAUDET, formatEuro } from '../utils/calculations';
import Liitteet from './Liitteet';

interface SuoramaksuPending {
  kuukausi: number;
  maara: number;
  osapuoliId: string;
  paiva: string;
}

interface Props {
  vesilaskut: Vesilasku[];
  osapuolet: [Osapuoli, Osapuoli];
  lukittu?: boolean;
  dublikaattiKuukaudet?: Set<number>;
  onChange: (vesilaskut: Vesilasku[]) => void;
  onSuoramaksu?: (osapuoliId: string, paiva: string, maara: number, kommentti: string) => void;
}

export default function Vesilaskut({ vesilaskut, osapuolet, lukittu, dublikaattiKuukaudet, onChange, onSuoramaksu }: Props) {
  const [suoramaksuAuki, setSuoramaksuAuki] = useState<number | null>(null);
  const [suoramaksuData, setSuoramaksuData] = useState<Partial<SuoramaksuPending>>({});

  const avaSuoramaksu = (v: Vesilasku) => {
    const maara = Math.round((v.perusmaksu + v.kayttomaksu) * 100) / 100;
    setSuoramaksuData({
      kuukausi: v.kuukausi,
      maara,
      osapuoliId: osapuolet[0].id,
      paiva: v.erapaiva || '',
    });
    setSuoramaksuAuki(v.kuukausi);
  };

  const vahvistaSuoramaksu = () => {
    if (!suoramaksuData.osapuoliId || !suoramaksuData.paiva || !suoramaksuData.maara) return;
    const kuukausiNimi = KUUKAUDET[(suoramaksuData.kuukausi ?? 1) - 1];
    onSuoramaksu?.(
      suoramaksuData.osapuoliId,
      suoramaksuData.paiva,
      suoramaksuData.maara,
      `Vesilasku ${kuukausiNimi} (suoramaksu)`
    );
    setSuoramaksuAuki(null);
  };

  const paivita = (
    kuukausi: number,
    kentta: keyof Vesilasku,
    arvo: string | number | string[]
  ) => {
    onChange(
      vesilaskut.map((v) =>
        v.kuukausi === kuukausi ? { ...v, [kentta]: arvo } : v
      )
    );
  };

  const aktiiviset = dublikaattiKuukaudet
    ? vesilaskut.filter((v) => !dublikaattiKuukaudet.has(v.kuukausi))
    : vesilaskut;

  const totalPerusmaksu = aktiiviset.reduce((s, v) => s + v.perusmaksu, 0);
  const totalKayttomaksu = aktiiviset.reduce((s, v) => s + v.kayttomaksu, 0);
  const totalYhteensa = totalPerusmaksu + totalKayttomaksu;
  const onDublikaatteja = dublikaattiKuukaudet && dublikaattiKuukaudet.size > 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Vesilaskut</h2>

      {onDublikaatteja && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <span>⚠</span>
          <span>Keltaisella merkityt laskut löytyvät jo edellisen vuoden tasauksesta — ne näytetään mutta jätetään pois tämän vuoden laskennasta.</span>
        </div>
      )}

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
              <th className="pb-2 pr-3 font-medium">Kommentti</th>
              <th className="pb-2 pr-3 font-medium">Liitteet</th>
              {onSuoramaksu && <th className="pb-2 font-medium w-8"></th>}
            </tr>
          </thead>
          {vesilaskut.map((v) => {
              const onDublikaatti = dublikaattiKuukaudet?.has(v.kuukausi) ?? false;
              return (
                <tbody key={v.kuukausi}>
                <tr
                  className={`border-b border-gray-100 ${onDublikaatti ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-1.5 pr-3 font-medium text-gray-700">
                    <div className="flex items-center gap-1">
                      {KUUKAUDET[v.kuukausi - 1]}
                      {onDublikaatti && (
                        <span
                          className="text-amber-500 text-xs"
                          title="Tämä lasku on jo edellisen vuoden tasauksessa — jätetty pois laskennasta"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="date"
                      value={v.erapaiva}
                      onChange={(e) => paivita(v.kuukausi, 'erapaiva', e.target.value)}
                      disabled={lukittu}
                      className="border border-gray-200 rounded px-2 py-1 w-36 disabled:bg-gray-50 disabled:text-gray-500"
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
                      disabled={lukittu}
                      className={`border border-gray-200 rounded px-2 py-1 w-28 text-right disabled:bg-gray-50 disabled:text-gray-500 ${onDublikaatti ? 'line-through text-gray-400' : ''}`}
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
                      disabled={lukittu}
                      className={`border border-gray-200 rounded px-2 py-1 w-28 text-right disabled:bg-gray-50 disabled:text-gray-500 ${onDublikaatti ? 'line-through text-gray-400' : ''}`}
                    />
                  </td>
                  <td className={`py-1.5 pr-3 text-right font-medium ${onDublikaatti ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {formatEuro(v.perusmaksu + v.kayttomaksu)}
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="text"
                      value={v.kommentti}
                      onChange={(e) => paivita(v.kuukausi, 'kommentti', e.target.value)}
                      disabled={lukittu}
                      className="border border-gray-200 rounded px-2 py-1 w-full min-w-40 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Kommentti"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <Liitteet
                      liiteIds={v.liitteet ?? []}
                      onChange={(ids) => paivita(v.kuukausi, 'liitteet', ids)}
                      label="Lisää lasku"
                    />
                  </td>
                  {onSuoramaksu && (
                    <td className="py-1.5">
                      {!lukittu && (
                        <button
                          onClick={() => suoramaksuAuki === v.kuukausi ? setSuoramaksuAuki(null) : avaSuoramaksu(v)}
                          title="Merkitse maksetuksi suoraan osapuolen tililtä"
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${suoramaksuAuki === v.kuukausi ? 'bg-green-100 border-green-300 text-green-700' : 'border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300'}`}
                        >
                          💳
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {suoramaksuAuki === v.kuukausi && (
                  <tr className="bg-green-50 border-b border-green-200">
                    <td colSpan={onSuoramaksu ? 8 : 7} className="px-3 py-2">
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="text-green-800 font-medium">Suoramaksu — {KUUKAUDET[v.kuukausi - 1]}:</span>
                        <select
                          value={suoramaksuData.osapuoliId}
                          onChange={(e) => setSuoramaksuData({ ...suoramaksuData, osapuoliId: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs"
                        >
                          {osapuolet.map((op) => (
                            <option key={op.id} value={op.id}>{op.nimi}</option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-xs">maksoi</span>
                        <input
                          type="number"
                          value={suoramaksuData.maara ?? ''}
                          onChange={(e) => setSuoramaksuData({ ...suoramaksuData, maara: parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          className="border border-gray-200 rounded px-2 py-1 w-24 text-right text-xs"
                        />
                        <span className="text-gray-500 text-xs">€ päivänä</span>
                        <input
                          type="date"
                          value={suoramaksuData.paiva ?? ''}
                          onChange={(e) => setSuoramaksuData({ ...suoramaksuData, paiva: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={vahvistaSuoramaksu}
                          disabled={!suoramaksuData.paiva || !suoramaksuData.maara}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          Lisää maksuihin
                        </button>
                        <button
                          onClick={() => setSuoramaksuAuki(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Peruuta
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </tbody>
              );
          })}
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
              <td className="py-2 pr-3 text-gray-700">
                Yhteensä{onDublikaatteja ? ' (ilman duplikaatteja)' : ''}
              </td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalPerusmaksu)}</td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalKayttomaksu)}</td>
              <td className="py-2 pr-3 text-right">{formatEuro(totalYhteensa)}</td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3"></td>
              {onSuoramaksu && <td className="py-2"></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
