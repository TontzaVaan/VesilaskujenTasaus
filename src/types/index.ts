export interface Osapuoli {
  id: string;
  nimi: string;
}

export interface Maksu {
  id: string;
  paiva: string;
  osapuoliId: string;
  maara: number;
  kommentti: string;
}

export interface Vesilasku {
  kuukausi: number; // 1–12
  erapaiva: string;
  perusmaksu: number;
  kayttomaksu: number;
  kommentti: string;
}

export interface Mittarilukema {
  alkuPvm: string;
  alkuLukema: number;
  loppuPvm: string;
  loppuLukema: number;
}

export interface Mittarit {
  yhteinen: Mittarilukema;
  alamittari: Mittarilukema; // osapuoli 1 (Pakarinen)
}

export interface KiinteistoveroTontti {
  maapohjaVero: number;
}

export interface RakennusVero {
  id: string;
  nimi: string;
  omistajaId: string;
  maara: number;
}

export interface MuuKulu {
  id: string;
  kuvaus: string;
  paiva: string;
  yhteensa: number;
  op1Prosentti: number; // 0–100
}

export interface VuosiData {
  vuosi: number;
  maksut: Maksu[];
  vesilaskut: Vesilasku[];
  mittarit: Mittarit;
  kiinteistoveroTontti: KiinteistoveroTontti;
  rakennusverot: RakennusVero[];
  muutKulut: MuuKulu[];
}

export interface Tontti {
  op1Neliometrit: number;
  op2Neliometrit: number;
}

export interface AppData {
  osapuolet: [Osapuoli, Osapuoli];
  tontti: Tontti;
  vuodet: VuosiData[];
}

export interface TasausLaskelma {
  op1Maksut: number;
  op2Maksut: number;
  op1VesiKulut: number;
  op2VesiKulut: number;
  op1MaapohjaVero: number;
  op2MaapohjaVero: number;
  op1RakennusVero: number;
  op2RakennusVero: number;
  op1MuutKulut: number;
  op2MuutKulut: number;
  op1KokonaisKulut: number;
  op2KokonaisKulut: number;
  op1Saldo: number;
  op2Saldo: number;
  tasausErotus: number;
  maksajaId: string;
  saajaid: string;
  // Vesikulutukset
  yhteismaara: number;
  op1Kulutus: number;
  op2Kulutus: number;
  op1KulutusPct: number;
  op2KulutusPct: number;
  // Tonttijako
  op1TonttiPct: number;
  op2TonttiPct: number;
}
