import { useState } from 'react';
import type { AppData, VesimittariLukema } from '../types';
import { ANTHROPIC_KEY_STORAGE_KEY } from '../utils/invoiceAnalysis';

interface Props {
  appData: AppData;
  onSave: (osapuolet: AppData['osapuolet'], tontti: AppData['tontti'], vesimittarit: VesimittariLukema[]) => void;
  onClose: () => void;
}

export default function Asetukset({ appData, onSave, onClose }: Props) {
  const [op1Nimi, setOp1Nimi] = useState(appData.osapuolet[0].nimi);
  const [op2Nimi, setOp2Nimi] = useState(appData.osapuolet[1].nimi);
  const [op1Nelio, setOp1Nelio] = useState(appData.tontti.op1Neliometrit);
  const [op2Nelio, setOp2Nelio] = useState(appData.tontti.op2Neliometrit);
  const [kiinteistoveroProsentti, setKiinteistoveroProsentti] = useState<number | ''>(
    appData.tontti.op1KiinteistoveroProsentti ?? ''
  );
  const [anthropicKey, setAnthropicKey] = useState(
    () => localStorage.getItem(ANTHROPIC_KEY_STORAGE_KEY) ?? ''
  );
  const [vesimittarit, setVesimittarit] = useState<VesimittariLukema[]>(
    () => [...(appData.vesimittarit ?? [])].sort((a, b) => b.vuosi - a.vuosi)
  );

  const lisaaVesimittariRivi = () => {
    const uusiVuosi = vesimittarit.length > 0 ? vesimittarit[0].vuosi + 1 : new Date().getFullYear();
    setVesimittarit([{ vuosi: uusiVuosi, pusaLukema: 0, pakarineLukema: 0 }, ...vesimittarit]);
  };

  const paivitaVesimittari = (idx: number, kentta: keyof VesimittariLukema, arvo: number) => {
    setVesimittarit(vesimittarit.map((r, i) => i === idx ? { ...r, [kentta]: arvo } : r));
  };

  const poistaVesimittari = (idx: number) => {
    setVesimittarit(vesimittarit.filter((_, i) => i !== idx));
  };

  const tallenna = () => {
    onSave(
      [
        { ...appData.osapuolet[0], nimi: op1Nimi },
        { ...appData.osapuolet[1], nimi: op2Nimi },
      ],
      {
        op1Neliometrit: op1Nelio,
        op2Neliometrit: op2Nelio,
        op1KiinteistoveroProsentti:
          kiinteistoveroProsentti === '' ? undefined : kiinteistoveroProsentti,
      },
      [...vesimittarit].sort((a, b) => a.vuosi - b.vuosi)
    );
    if (anthropicKey.trim()) {
      localStorage.setItem(ANTHROPIC_KEY_STORAGE_KEY, anthropicKey.trim());
    } else {
      localStorage.removeItem(ANTHROPIC_KEY_STORAGE_KEY);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Asetukset</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Osapuoli 1 nimi
            </label>
            <input
              type="text"
              value={op1Nimi}
              onChange={(e) => setOp1Nimi(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Osapuoli 2 nimi
            </label>
            <input
              type="text"
              value={op2Nimi}
              onChange={(e) => setOp2Nimi(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Tontin neliömetrit (maapohjaveron jako)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {op1Nimi} (m²)
                </label>
                <input
                  type="number"
                  value={op1Nelio || ''}
                  onChange={(e) => setOp1Nelio(parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-right"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {op2Nimi} (m²)
                </label>
                <input
                  type="number"
                  value={op2Nelio || ''}
                  onChange={(e) => setOp2Nelio(parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-right"
                />
              </div>
            </div>
            {op1Nelio + op2Nelio > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {op1Nimi}: {((op1Nelio / (op1Nelio + op2Nelio)) * 100).toFixed(1)} % /{' '}
                {op2Nimi}: {((op2Nelio / (op1Nelio + op2Nelio)) * 100).toFixed(1)} %
              </p>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Kiinteistöveron jako-% ({op1Nimi})
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Jos asetettu, käytetään tätä tonttiveron jakoon. Muuten lasketaan m²-suhteesta.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={kiinteistoveroProsentti}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setKiinteistoveroProsentti('');
                  } else {
                    setKiinteistoveroProsentti(
                      Math.min(100, Math.max(0, parseFloat(v) || 0))
                    );
                  }
                }}
                min={0}
                max={100}
                step="0.1"
                placeholder="esim. 58.3"
                className="border border-gray-300 rounded-lg px-3 py-2 w-28 text-right"
              />
              <span className="text-sm text-gray-500">%</span>
              {kiinteistoveroProsentti !== '' && (
                <span className="text-xs text-gray-400">
                  {op2Nimi}: {(100 - kiinteistoveroProsentti).toFixed(1)} %
                </span>
              )}
              {kiinteistoveroProsentti !== '' && (
                <button
                  onClick={() => setKiinteistoveroProsentti('')}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Poista
                </button>
              )}
            </div>
          </div>
        </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Vesimittarilukemat (joulukuun lopun lukemat)
              </h3>
              <button
                onClick={lisaaVesimittariRivi}
                className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-0.5"
              >
                + Lisää lukema
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Syötä joulukuun lopun mittarilukemat vuosittain. Kulutus lasketaan peräkkäisten vuosien erotuksena.
            </p>
            {vesimittarit.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Ei lukemia. Lisää ensimmäinen lukema yllä olevalla napilla.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-200">
                      <th className="text-left pb-1 font-medium">Vuosi</th>
                      <th className="text-right pb-1 font-medium">{op2Nimi} (m³)</th>
                      <th className="text-right pb-1 font-medium">{op1Nimi} (m³)</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vesimittarit.map((r, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            value={r.vuosi || ''}
                            onChange={(e) => paivitaVesimittari(idx, 'vuosi', parseInt(e.target.value) || 0)}
                            className="border border-gray-200 rounded px-1.5 py-0.5 w-20 text-right"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            value={r.pusaLukema || ''}
                            onChange={(e) => paivitaVesimittari(idx, 'pusaLukema', parseFloat(e.target.value) || 0)}
                            className="border border-gray-200 rounded px-1.5 py-0.5 w-24 text-right"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            value={r.pakarineLukema || ''}
                            onChange={(e) => paivitaVesimittari(idx, 'pakarineLukema', parseFloat(e.target.value) || 0)}
                            className="border border-gray-200 rounded px-1.5 py-0.5 w-24 text-right"
                          />
                        </td>
                        <td className="py-1">
                          <button
                            onClick={() => poistaVesimittari(idx)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Anthropic API-avain (laskujen automaattinen tunnistus)
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Tarvitaan laskujen analysoinnissa. Tallennetaan vain paikallisesti selaimen muistiin.
            </p>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="border border-gray-300 rounded-lg px-3 py-2 w-full font-mono text-sm"
            />
          </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Peruuta
          </button>
          <button
            onClick={tallenna}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tallenna
          </button>
        </div>
      </div>
    </div>
  );
}
