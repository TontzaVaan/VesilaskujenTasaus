import { useState } from 'react';
import type { AppData } from '../types';

interface Props {
  appData: AppData;
  onSave: (osapuolet: AppData['osapuolet'], tontti: AppData['tontti']) => void;
  onClose: () => void;
}

export default function Asetukset({ appData, onSave, onClose }: Props) {
  const [op1Nimi, setOp1Nimi] = useState(appData.osapuolet[0].nimi);
  const [op2Nimi, setOp2Nimi] = useState(appData.osapuolet[1].nimi);
  const [op1Nelio, setOp1Nelio] = useState(appData.tontti.op1Neliometrit);
  const [op2Nelio, setOp2Nelio] = useState(appData.tontti.op2Neliometrit);

  const tallenna = () => {
    onSave(
      [
        { ...appData.osapuolet[0], nimi: op1Nimi },
        { ...appData.osapuolet[1], nimi: op2Nimi },
      ],
      { op1Neliometrit: op1Nelio, op2Neliometrit: op2Nelio }
    );
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
