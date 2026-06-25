import type { AppData, VuosiData, Mittarit, VuosiStatus } from '../types';

const STORAGE_KEY = 'onnenkoukku-data';

function tyhjaMittarit(): Mittarit {
  return {
    yhteinen: { alkuPvm: '', alkuLukema: 0, loppuPvm: '', loppuLukema: 0 },
    alamittari: { alkuPvm: '', alkuLukema: 0, loppuPvm: '', loppuLukema: 0 },
  };
}

export function tyhjaVuosiData(vuosi: number): VuosiData {
  return {
    vuosi,
    maksut: [],
    vesilaskut: Array.from({ length: 12 }, (_, i) => ({
      kuukausi: i + 1,
      erapaiva: '',
      perusmaksu: 0,
      kayttomaksu: 0,
      kommentti: '',
    })),
    mittarit: tyhjaMittarit(),
    kiinteistoveroTontti: { maapohjaVero: 0 },
    rakennusverot: [],
    muutKulut: [],
  };
}

export function defaultAppData(): AppData {
  const historia = Array.from({ length: 5 }, (_, i) => ({
    ...tyhjaVuosiData(2020 + i),
    status: 'valmis' as VuosiStatus,
  }));
  const aktiivinenVuosi = { ...tyhjaVuosiData(2025), status: 'kesken' as VuosiStatus };
  return {
    osapuolet: [
      { id: 'op1', nimi: 'Pakarinen' },
      { id: 'op2', nimi: 'Pusa' },
    ],
    tontti: { op1Neliometrit: 0, op2Neliometrit: 0 },
    vuodet: [...historia, aktiivinenVuosi],
  };
}

export function lataaData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppData();
    const data = JSON.parse(raw) as AppData;
    // Varmista että kaikilla vuosilla on kaikki kentät
    data.vuodet = data.vuodet.map((v) => ({
      ...tyhjaVuosiData(v.vuosi),
      ...v,
      mittarit: { ...tyhjaMittarit(), ...v.mittarit },
    }));
    return data;
  } catch {
    return defaultAppData();
  }
}

export function tallennaData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
