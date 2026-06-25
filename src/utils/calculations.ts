import type { VuosiData, Tontti, TasausLaskelma } from '../types';

export function laskeTasaus(
  vuosiData: VuosiData,
  tontti: Tontti,
  op1Id: string,
  op2Id: string
): TasausLaskelma {
  // --- Maksut ---
  const op1Maksut = vuosiData.maksut
    .filter((m) => m.osapuoliId === op1Id)
    .reduce((s, m) => s + m.maara, 0);
  const op2Maksut = vuosiData.maksut
    .filter((m) => m.osapuoliId === op2Id)
    .reduce((s, m) => s + m.maara, 0);

  // --- Vesilaskut ---
  const yhteisPerusmaksu = vuosiData.vesilaskut.reduce(
    (s, v) => s + v.perusmaksu,
    0
  );
  const yhteisKayttomaksu = vuosiData.vesilaskut.reduce(
    (s, v) => s + v.kayttomaksu,
    0
  );

  // Vesikulutukset
  const yhteismaara =
    vuosiData.mittarit.yhteinen.loppuLukema -
    vuosiData.mittarit.yhteinen.alkuLukema;
  const op1Kulutus =
    vuosiData.mittarit.alamittari.loppuLukema -
    vuosiData.mittarit.alamittari.alkuLukema;
  const op2Kulutus = Math.max(0, yhteismaara - op1Kulutus);

  const totalKulutus = op1Kulutus + op2Kulutus;
  const op1KulutusPct = totalKulutus > 0 ? op1Kulutus / totalKulutus : 0.5;
  const op2KulutusPct = totalKulutus > 0 ? op2Kulutus / totalKulutus : 0.5;

  const op1VesiKulut =
    yhteisPerusmaksu / 2 + yhteisKayttomaksu * op1KulutusPct;
  const op2VesiKulut =
    yhteisPerusmaksu / 2 + yhteisKayttomaksu * op2KulutusPct;

  // --- Kiinteistövero / Tontti ---
  const kokonaisNelio =
    tontti.op1Neliometrit + tontti.op2Neliometrit;
  const op1TonttiPct =
    kokonaisNelio > 0 ? tontti.op1Neliometrit / kokonaisNelio : 0.5;
  const op2TonttiPct =
    kokonaisNelio > 0 ? tontti.op2Neliometrit / kokonaisNelio : 0.5;

  const maapohjaVero = vuosiData.kiinteistoveroTontti.maapohjaVero;
  const op1MaapohjaVero = maapohjaVero * op1TonttiPct;
  const op2MaapohjaVero = maapohjaVero * op2TonttiPct;

  // --- Rakennusverot ---
  const op1RakennusVero = vuosiData.rakennusverot
    .filter((r) => r.omistajaId === op1Id)
    .reduce((s, r) => s + r.maara, 0);
  const op2RakennusVero = vuosiData.rakennusverot
    .filter((r) => r.omistajaId === op2Id)
    .reduce((s, r) => s + r.maara, 0);

  // --- Muut kulut ---
  const op1MuutKulut = vuosiData.muutKulut.reduce(
    (s, k) => s + k.yhteensa * (k.op1Prosentti / 100),
    0
  );
  const op2MuutKulut = vuosiData.muutKulut.reduce(
    (s, k) => s + k.yhteensa * ((100 - k.op1Prosentti) / 100),
    0
  );

  // --- Yhteensä ---
  const op1KokonaisKulut =
    op1VesiKulut + op1MaapohjaVero + op1RakennusVero + op1MuutKulut;
  const op2KokonaisKulut =
    op2VesiKulut + op2MaapohjaVero + op2RakennusVero + op2MuutKulut;

  // --- Saldot ---
  const op1Saldo = op1Maksut - op1KokonaisKulut;
  const op2Saldo = op2Maksut - op2KokonaisKulut;

  // --- Tasaus ---
  const erotus = op1Saldo - op2Saldo;
  const tasausErotus = Math.abs(erotus);
  const maksajaId = erotus < 0 ? op1Id : op2Id;
  const saajaid = erotus < 0 ? op2Id : op1Id;

  return {
    op1Maksut,
    op2Maksut,
    op1VesiKulut,
    op2VesiKulut,
    op1MaapohjaVero,
    op2MaapohjaVero,
    op1RakennusVero,
    op2RakennusVero,
    op1MuutKulut,
    op2MuutKulut,
    op1KokonaisKulut,
    op2KokonaisKulut,
    op1Saldo,
    op2Saldo,
    tasausErotus,
    maksajaId,
    saajaid,
    yhteismaara,
    op1Kulutus,
    op2Kulutus,
    op1KulutusPct,
    op2KulutusPct,
    op1TonttiPct,
    op2TonttiPct,
  };
}

export function formatEuro(n: number): string {
  return n.toLocaleString('fi-FI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function formatPct(n: number): string {
  return (n * 100).toFixed(1) + ' %';
}

export const KUUKAUDET = [
  'Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä',
  'Heinä', 'Elo', 'Syys', 'Loka', 'Marras', 'Joulu',
];
