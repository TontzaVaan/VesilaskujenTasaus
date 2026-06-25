import { useState, useCallback } from 'react';
import type { AppData, VuosiData } from '../types';
import { lataaData, tallennaData, tyhjaVuosiData } from '../utils/storage';

export function useAppData() {
  const [data, setData] = useState<AppData>(() => lataaData());

  const paivita = useCallback((uusiData: AppData) => {
    setData(uusiData);
    tallennaData(uusiData);
  }, []);

  const paivitaVuosi = useCallback(
    (vuosi: number, paivitys: Partial<VuosiData>) => {
      setData((prev) => {
        const vuodet = prev.vuodet.map((v) =>
          v.vuosi === vuosi ? { ...v, ...paivitys } : v
        );
        const uusi = { ...prev, vuodet };
        tallennaData(uusi);
        return uusi;
      });
    },
    []
  );

  const lisaaVuosi = useCallback((vuosi: number) => {
    setData((prev) => {
      if (prev.vuodet.some((v) => v.vuosi === vuosi)) return prev;
      const uusi = {
        ...prev,
        vuodet: [...prev.vuodet, tyhjaVuosiData(vuosi)].sort(
          (a, b) => a.vuosi - b.vuosi
        ),
      };
      tallennaData(uusi);
      return uusi;
    });
  }, []);

  const paivitaAsetukset = useCallback(
    (
      osapuolet: AppData['osapuolet'],
      tontti: AppData['tontti']
    ) => {
      setData((prev) => {
        const uusi = { ...prev, osapuolet, tontti };
        tallennaData(uusi);
        return uusi;
      });
    },
    []
  );

  return { data, paivita, paivitaVuosi, lisaaVuosi, paivitaAsetukset };
}
