import { useEffect, useRef, useState } from 'react';
import { haeTiedostot, tallennaTiedosto, poistaTiedosto } from '../utils/fileStorage';
import type { Liite } from '../utils/fileStorage';

interface Props {
  liiteIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

function formatKoko(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Liitteet({ liiteIds, onChange, label = 'Lisää liite' }: Props) {
  const [liitteet, setLiitteet] = useState<Liite[]>([]);
  const [ladataan, setLadataan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (liiteIds.length === 0) {
      setLiitteet([]);
      return;
    }
    haeTiedostot(liiteIds).then(setLiitteet);
  }, [liiteIds]);

  const lisaaTiedosto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const tiedostot = e.target.files;
    if (!tiedostot || tiedostot.length === 0) return;
    setLadataan(true);
    try {
      const uudetIdt: string[] = [];
      for (const f of Array.from(tiedostot)) {
        const id = await tallennaTiedosto(f);
        uudetIdt.push(id);
      }
      onChange([...liiteIds, ...uudetIdt]);
    } finally {
      setLadataan(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const poista = async (id: string) => {
    await poistaTiedosto(id);
    onChange(liiteIds.filter((i) => i !== id));
  };

  const avaa = (liite: Liite) => {
    const blob = new Blob([liite.data], { type: liite.tyyppi });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const onKuva = (liite: Liite) => liite.tyyppi.startsWith('image/');

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {liitteet.map((l) => (
        <div
          key={l.id}
          className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs group"
        >
          {onKuva(l) ? (
            <button
              onClick={() => avaa(l)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              title={l.nimi}
            >
              <span className="text-base leading-none">🖼</span>
              <span className="max-w-24 truncate">{l.nimi}</span>
              <span className="text-gray-400">({formatKoko(l.koko)})</span>
            </button>
          ) : (
            <button
              onClick={() => avaa(l)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              title={l.nimi}
            >
              <span className="text-base leading-none">📄</span>
              <span className="max-w-24 truncate">{l.nimi}</span>
              <span className="text-gray-400">({formatKoko(l.koko)})</span>
            </button>
          )}
          <button
            onClick={() => poista(l.id)}
            className="text-gray-400 hover:text-red-500 ml-1 leading-none"
            title="Poista liite"
          >
            ×
          </button>
        </div>
      ))}

      <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 bg-blue-50 rounded px-2 py-1">
        {ladataan ? 'Ladataan...' : `+ ${label}`}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          onChange={lisaaTiedosto}
          className="hidden"
          disabled={ladataan}
        />
      </label>
    </div>
  );
}
