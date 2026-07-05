import { useEffect, useRef, useState } from 'react';
import heic2any from 'heic2any';
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

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

async function muunnaJaLisaa(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const blob = Array.isArray(result) ? result[0] : result;
  const nimi = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], nimi, { type: 'image/jpeg' });
}

export default function Liitteet({ liiteIds, onChange, label = 'Lisää liite' }: Props) {
  const [liitteet, setLiitteet] = useState<Liite[]>([]);
  const [ladataan, setLadataan] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (liiteIds.length === 0) {
      setLiitteet([]);
      return;
    }
    haeTiedostot(liiteIds).then(setLiitteet);
  }, [liiteIds]);

  const kasitteleTiedostot = async (tiedostot: FileList | File[]) => {
    const lista = Array.from(tiedostot);
    if (lista.length === 0) return;
    setLadataan(true);
    try {
      const uudetIdt: string[] = [];
      for (const f of lista) {
        const muunnettu = await muunnaJaLisaa(f);
        const id = await tallennaTiedosto(muunnettu);
        uudetIdt.push(id);
      }
      onChange([...liiteIds, ...uudetIdt]);
    } finally {
      setLadataan(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const lisaaTiedosto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) kasitteleTiedostot(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) kasitteleTiedostot(e.dataTransfer.files);
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
    <div
      className={`flex flex-wrap items-center gap-2 mt-1 rounded-lg transition-colors ${
        dragOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset p-1' : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {liitteet.map((l) => (
        <div
          key={l.id}
          className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs group"
        >
          <button
            onClick={() => avaa(l)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            title={l.nimi}
          >
            <span className="text-base leading-none">{onKuva(l) ? '🖼' : '📄'}</span>
            <span className="max-w-24 truncate">{l.nimi}</span>
            <span className="text-gray-400">({formatKoko(l.koko)})</span>
          </button>
          <button
            onClick={() => poista(l.id)}
            className="text-gray-400 hover:text-red-500 ml-1 leading-none"
            title="Poista liite"
          >
            ×
          </button>
        </div>
      ))}

      <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 bg-blue-50 rounded px-2 py-1 select-none">
        {ladataan ? 'Ladataan...' : dragOver ? 'Pudota tähän' : `+ ${label}`}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          onChange={lisaaTiedosto}
          className="hidden"
          disabled={ladataan}
        />
      </label>
    </div>
  );
}
