/**
 * Canonical species derivation for the Mezastar Trade Fairness Tool.
 *
 * SINGLE SOURCE OF TRUTH for mapping a per-tag `enName` to its base species.
 * The migration script (M1) and the popularity table MUST agree on species,
 * because popularity attaches at the SPECIES level and joins back to every tag.
 * This module is exactly the logic that seeded the Notion Species Popularity
 * Table (259 species derived from the 374-tag seed). Do not fork it.
 *
 * Design notes (the non-obvious cases this handles):
 *  - Regional forms (Hisuian/Galarian/Alolan/Paldean) collapse to base species.
 *    Popularity is a franchise-wide, species-level signal; an Alolan Ninetales
 *    tag inherits Ninetales' popularity. (Scarcity, which DOES differ by form,
 *    lives on the tag, not here.)
 *  - Mega/Gigantamax/G-Max/Primal are battle/forme states, not species → collapse.
 *  - Kyurem's Black/White formes and Calyrex's Ice/Shadow Rider fusions collapse
 *    to Kyurem / Calyrex respectively.
 *  - "Charizard X" (a Mega forme label in the seed) collapses to Charizard.
 *  - Nidoran(female) and Nidoran(male) are KEPT SEPARATE: they are distinct
 *    National Dex entries (#029 / #032), not a form split.
 *  - The seed's single dual-tag "Lunatone/Solrock" splits into two species.
 *
 * If a future set introduces a new regional/forme prefix, add it to PREFIXES.
 * If a future tag is a new dual-tag, add it to DUAL_TAG_SPLITS.
 */

export interface SpeciesDexInfo {
  /** National Pokédex number. */
  dex: number;
  /** Generation (1-9), derived from the dex number's range. */
  gen: number;
}

/** Regional-form and forme prefixes that are stripped to reach base species. */
export const SPECIES_PREFIXES: readonly string[] = [
  "Hisuian ",
  "Galarian ",
  "Alolan ",
  "Paldean ",
  "Mega ",
  "Gigantamax ",
  "G-Max ",
  "Primal ",
];

/** Named formes that map to a base species not reachable by prefix-stripping. */
export const SPECIES_COLLAPSE: Readonly<Record<string, string>> = {
  "Black Kyurem": "Kyurem",
  "White Kyurem": "Kyurem",
  "Charizard X": "Charizard",
  "Calyrex Ice Rider": "Calyrex",
  "Calyrex Shadow Rider": "Calyrex",
};

/** Dual-tag enNames that represent two species on one physical tag. */
export const DUAL_TAG_SPLITS: Readonly<Record<string, readonly string[]>> = {
  "Lunatone/Solrock": ["Lunatone", "Solrock"],
};

/**
 * Derive the base species (or species list, for dual-tags) from a tag's enName.
 * Returns an array: length 1 for normal tags, length 2 for dual-tags.
 * The migration should emit one popularity-join key per returned species.
 */
export function deriveSpecies(enName: string): string[] {
  const trimmed = enName.trim();
  const dual = DUAL_TAG_SPLITS[trimmed];
  if (dual) {
    return [...dual];
  }
  // Strip parenthetical forme descriptors, e.g. "Toxtricity (Amped)".
  let n = trimmed.replace(/\s*\(.*?\)\s*/g, "").trim();
  for (const pre of SPECIES_PREFIXES) {
    if (n.startsWith(pre)) {
      n = n.slice(pre.length);
      break;
    }
  }
  n = n.trim();
  return [SPECIES_COLLAPSE[n] ?? n];
}

/**
 * Convenience for single-species tags. Throws on a dual-tag so callers must
 * decide explicitly how to handle the 2-species case (migration uses
 * deriveSpecies and emits a migration-report entry).
 */
export function deriveSingleSpecies(enName: string): string {
  const out = deriveSpecies(enName);
  const [first] = out;
  if (out.length !== 1 || first === undefined) {
    throw new Error(
      `deriveSingleSpecies: "${enName}" maps to ${out.length} species (${out.join(", ")}); use deriveSpecies().`,
    );
  }
  return first;
}

/**
 * National Dex number + generation for every species present in the v1 seed
 * (259 species across 374 tags). Keyed by the canonical base-species name
 * returned by deriveSpecies(). Used to enrich the catalog and to sanity-check
 * that the popularity table and the migrated tags reference the same species.
 */
export const SPECIES_DEX: Readonly<Record<string, SpeciesDexInfo>> = {
  "Abomasnow": { dex: 460, gen: 4 },
  "Abra": { dex: 63, gen: 1 },
  "Aggron": { dex: 306, gen: 3 },
  "Alakazam": { dex: 65, gen: 1 },
  "Alcremie": { dex: 869, gen: 8 },
  "Appletun": { dex: 842, gen: 8 },
  "Arcanine": { dex: 59, gen: 1 },
  "Arceus": { dex: 493, gen: 4 },
  "Arctibax": { dex: 997, gen: 9 },
  "Axew": { dex: 610, gen: 5 },
  "Baltoy": { dex: 343, gen: 3 },
  "Baxcalibur": { dex: 998, gen: 9 },
  "Bayleef": { dex: 153, gen: 2 },
  "Beldum": { dex: 374, gen: 3 },
  "Blastoise": { dex: 9, gen: 1 },
  "Blaziken": { dex: 257, gen: 3 },
  "Boltund": { dex: 836, gen: 8 },
  "Bronzong": { dex: 437, gen: 4 },
  "Bronzor": { dex: 436, gen: 4 },
  "Buizel": { dex: 418, gen: 4 },
  "Buzzwole": { dex: 794, gen: 7 },
  "Calyrex": { dex: 898, gen: 8 },
  "Carkol": { dex: 838, gen: 8 },
  "Ceruledge": { dex: 937, gen: 9 },
  "Chandelure": { dex: 609, gen: 5 },
  "Charcadet": { dex: 935, gen: 9 },
  "Charizard": { dex: 6, gen: 1 },
  "Charjabug": { dex: 737, gen: 7 },
  "Chikorita": { dex: 152, gen: 2 },
  "Chimchar": { dex: 390, gen: 4 },
  "Cinderace": { dex: 815, gen: 8 },
  "Claydol": { dex: 344, gen: 3 },
  "Coalossal": { dex: 839, gen: 8 },
  "Combusken": { dex: 256, gen: 3 },
  "Copperajah": { dex: 879, gen: 8 },
  "Corviknight": { dex: 823, gen: 8 },
  "Cottonee": { dex: 546, gen: 5 },
  "Cradily": { dex: 346, gen: 3 },
  "Crocalor": { dex: 910, gen: 9 },
  "Croconaw": { dex: 159, gen: 2 },
  "Cyndaquil": { dex: 155, gen: 2 },
  "Deino": { dex: 633, gen: 5 },
  "Dhelmise": { dex: 781, gen: 7 },
  "Dialga": { dex: 483, gen: 4 },
  "Dodrio": { dex: 85, gen: 1 },
  "Doduo": { dex: 84, gen: 1 },
  "Dondozo": { dex: 977, gen: 9 },
  "Dragapult": { dex: 887, gen: 8 },
  "Dragonite": { dex: 149, gen: 1 },
  "Drakloak": { dex: 886, gen: 8 },
  "Drampa": { dex: 780, gen: 7 },
  "Drednaw": { dex: 834, gen: 8 },
  "Dreepy": { dex: 885, gen: 8 },
  "Drifblim": { dex: 426, gen: 4 },
  "Drifloon": { dex: 425, gen: 4 },
  "Drizzile": { dex: 817, gen: 8 },
  "Dubwool": { dex: 832, gen: 8 },
  "Dusclops": { dex: 356, gen: 3 },
  "Dusknoir": { dex: 477, gen: 4 },
  "Duskull": { dex: 355, gen: 3 },
  "Eevee": { dex: 133, gen: 1 },
  "Electabuzz": { dex: 125, gen: 1 },
  "Electivire": { dex: 466, gen: 4 },
  "Elekid": { dex: 239, gen: 2 },
  "Empoleon": { dex: 395, gen: 4 },
  "Entei": { dex: 244, gen: 2 },
  "Espeon": { dex: 196, gen: 2 },
  "Eternatus": { dex: 890, gen: 8 },
  "Farfetch'd": { dex: 83, gen: 1 },
  "Feraligatr": { dex: 160, gen: 2 },
  "Flapple": { dex: 841, gen: 8 },
  "Flareon": { dex: 136, gen: 1 },
  "Fletchinder": { dex: 662, gen: 6 },
  "Fletchling": { dex: 661, gen: 6 },
  "Floragato": { dex: 907, gen: 9 },
  "Flygon": { dex: 330, gen: 3 },
  "Fraxure": { dex: 611, gen: 5 },
  "Frigibax": { dex: 996, gen: 9 },
  "Frosmoth": { dex: 873, gen: 8 },
  "Fuecoco": { dex: 909, gen: 9 },
  "Gardevoir": { dex: 282, gen: 3 },
  "Gengar": { dex: 94, gen: 1 },
  "Glaceon": { dex: 471, gen: 4 },
  "Goodra": { dex: 706, gen: 6 },
  "Great Tusk": { dex: 984, gen: 9 },
  "Greninja": { dex: 658, gen: 6 },
  "Grimmsnarl": { dex: 861, gen: 8 },
  "Grookey": { dex: 810, gen: 8 },
  "Grotle": { dex: 388, gen: 4 },
  "Groudon": { dex: 383, gen: 3 },
  "Grovyle": { dex: 253, gen: 3 },
  "Growlithe": { dex: 58, gen: 1 },
  "Grubbin": { dex: 736, gen: 7 },
  "Hatenna": { dex: 856, gen: 8 },
  "Hatterene": { dex: 858, gen: 8 },
  "Hattrem": { dex: 857, gen: 8 },
  "Haxorus": { dex: 612, gen: 5 },
  "Heracross": { dex: 214, gen: 2 },
  "Ho-Oh": { dex: 250, gen: 2 },
  "Honchkrow": { dex: 430, gen: 4 },
  "Hydreigon": { dex: 635, gen: 5 },
  "Impidimp": { dex: 859, gen: 8 },
  "Infernape": { dex: 392, gen: 4 },
  "Inteleon": { dex: 818, gen: 8 },
  "Iron Treads": { dex: 990, gen: 9 },
  "Jolteon": { dex: 135, gen: 1 },
  "Jynx": { dex: 124, gen: 1 },
  "Kadabra": { dex: 64, gen: 1 },
  "Keldeo": { dex: 647, gen: 5 },
  "Kirlia": { dex: 281, gen: 3 },
  "Koffing": { dex: 109, gen: 1 },
  "Koraidon": { dex: 1007, gen: 9 },
  "Kyogre": { dex: 382, gen: 3 },
  "Kyurem": { dex: 646, gen: 5 },
  "Leafeon": { dex: 470, gen: 4 },
  "Lileep": { dex: 345, gen: 3 },
  "Linoone": { dex: 264, gen: 3 },
  "Lokix": { dex: 980, gen: 9 },
  "Lucario": { dex: 448, gen: 4 },
  "Lugia": { dex: 249, gen: 2 },
  "Lunala": { dex: 792, gen: 7 },
  "Lunatone": { dex: 337, gen: 3 },
  "Luxio": { dex: 404, gen: 4 },
  "Luxray": { dex: 405, gen: 4 },
  "Machamp": { dex: 68, gen: 1 },
  "Machoke": { dex: 67, gen: 1 },
  "Machop": { dex: 66, gen: 1 },
  "Magby": { dex: 240, gen: 2 },
  "Magmar": { dex: 126, gen: 1 },
  "Magmortar": { dex: 467, gen: 4 },
  "Mamoswine": { dex: 473, gen: 4 },
  "Marshtomp": { dex: 259, gen: 3 },
  "Meganium": { dex: 154, gen: 2 },
  "Meowscarada": { dex: 908, gen: 9 },
  "Metagross": { dex: 376, gen: 3 },
  "Metang": { dex: 375, gen: 3 },
  "Mew": { dex: 151, gen: 1 },
  "Mewtwo": { dex: 150, gen: 1 },
  "Mimikyu": { dex: 778, gen: 7 },
  "Miraidon": { dex: 1008, gen: 9 },
  "Monferno": { dex: 391, gen: 4 },
  "Morgrem": { dex: 860, gen: 8 },
  "Mudbray": { dex: 749, gen: 7 },
  "Mudkip": { dex: 258, gen: 3 },
  "Mudsdale": { dex: 750, gen: 7 },
  "Murkrow": { dex: 198, gen: 2 },
  "Nickit": { dex: 827, gen: 8 },
  "Nidoking": { dex: 34, gen: 1 },
  "Nidoqueen": { dex: 31, gen: 1 },
  "Nidoran♀": { dex: 29, gen: 1 },
  "Nidoran♂": { dex: 32, gen: 1 },
  "Nidorina": { dex: 30, gen: 1 },
  "Nidorino": { dex: 33, gen: 1 },
  "Ninetales": { dex: 38, gen: 1 },
  "Noibat": { dex: 714, gen: 6 },
  "Noivern": { dex: 715, gen: 6 },
  "Obstagoon": { dex: 862, gen: 8 },
  "Onix": { dex: 95, gen: 1 },
  "Orbeetle": { dex: 826, gen: 8 },
  "Palkia": { dex: 484, gen: 4 },
  "Pawmi": { dex: 921, gen: 9 },
  "Pawmo": { dex: 922, gen: 9 },
  "Pelipper": { dex: 279, gen: 3 },
  "Pidgeot": { dex: 18, gen: 1 },
  "Pidgeotto": { dex: 17, gen: 1 },
  "Pidgey": { dex: 16, gen: 1 },
  "Pikachu": { dex: 25, gen: 1 },
  "Piloswine": { dex: 221, gen: 2 },
  "Pinsir": { dex: 127, gen: 1 },
  "Piplup": { dex: 393, gen: 4 },
  "Polteageist": { dex: 855, gen: 8 },
  "Prinplup": { dex: 394, gen: 4 },
  "Quaquaval": { dex: 914, gen: 9 },
  "Quaxly": { dex: 912, gen: 9 },
  "Quaxwell": { dex: 913, gen: 9 },
  "Quilava": { dex: 156, gen: 2 },
  "Raboot": { dex: 814, gen: 8 },
  "Raichu": { dex: 26, gen: 1 },
  "Raikou": { dex: 243, gen: 2 },
  "Ralts": { dex: 280, gen: 3 },
  "Rayquaza": { dex: 384, gen: 3 },
  "Regice": { dex: 378, gen: 3 },
  "Regidrago": { dex: 895, gen: 8 },
  "Regieleki": { dex: 894, gen: 8 },
  "Regirock": { dex: 377, gen: 3 },
  "Registeel": { dex: 379, gen: 3 },
  "Reshiram": { dex: 643, gen: 5 },
  "Rhyperior": { dex: 464, gen: 4 },
  "Rillaboom": { dex: 812, gen: 8 },
  "Rolycoly": { dex: 837, gen: 8 },
  "Sandaconda": { dex: 844, gen: 8 },
  "Sandshrew": { dex: 27, gen: 1 },
  "Sandslash": { dex: 28, gen: 1 },
  "Sceptile": { dex: 254, gen: 3 },
  "Scorbunny": { dex: 813, gen: 8 },
  "Shinx": { dex: 403, gen: 4 },
  "Sigilyph": { dex: 561, gen: 5 },
  "Silicobra": { dex: 843, gen: 8 },
  "Sinistea": { dex: 854, gen: 8 },
  "Sirfetch'd": { dex: 865, gen: 8 },
  "Skeledirge": { dex: 911, gen: 9 },
  "Slowbro": { dex: 80, gen: 1 },
  "Slowpoke": { dex: 79, gen: 1 },
  "Sneasel": { dex: 215, gen: 2 },
  "Snom": { dex: 872, gen: 8 },
  "Snorlax": { dex: 143, gen: 1 },
  "Snover": { dex: 459, gen: 4 },
  "Sobble": { dex: 816, gen: 8 },
  "Solgaleo": { dex: 791, gen: 7 },
  "Solrock": { dex: 338, gen: 3 },
  "Sprigatito": { dex: 906, gen: 9 },
  "Stakataka": { dex: 805, gen: 7 },
  "Suicune": { dex: 245, gen: 2 },
  "Surskit": { dex: 283, gen: 3 },
  "Swampert": { dex: 260, gen: 3 },
  "Swinub": { dex: 220, gen: 2 },
  "Swoobat": { dex: 528, gen: 5 },
  "Sylveon": { dex: 700, gen: 6 },
  "Talonflame": { dex: 663, gen: 6 },
  "Thievul": { dex: 828, gen: 8 },
  "Thwackey": { dex: 811, gen: 8 },
  "Togedemaru": { dex: 777, gen: 7 },
  "Torchic": { dex: 255, gen: 3 },
  "Torterra": { dex: 389, gen: 4 },
  "Totodile": { dex: 158, gen: 2 },
  "Toxel": { dex: 848, gen: 8 },
  "Toxtricity": { dex: 849, gen: 8 },
  "Treecko": { dex: 252, gen: 3 },
  "Turtonator": { dex: 776, gen: 7 },
  "Turtwig": { dex: 387, gen: 4 },
  "Typhlosion": { dex: 157, gen: 2 },
  "Tyranitar": { dex: 248, gen: 2 },
  "Umbreon": { dex: 197, gen: 2 },
  "Vaporeon": { dex: 134, gen: 1 },
  "Venusaur": { dex: 3, gen: 1 },
  "Vespiquen": { dex: 416, gen: 4 },
  "Vikavolt": { dex: 738, gen: 7 },
  "Vulpix": { dex: 37, gen: 1 },
  "Weavile": { dex: 461, gen: 4 },
  "Weezing": { dex: 110, gen: 1 },
  "Whimsicott": { dex: 547, gen: 5 },
  "Wiglett": { dex: 960, gen: 9 },
  "Wingull": { dex: 278, gen: 3 },
  "Woobat": { dex: 527, gen: 5 },
  "Wooloo": { dex: 831, gen: 8 },
  "Wugtrio": { dex: 961, gen: 9 },
  "Xerneas": { dex: 716, gen: 6 },
  "Yamper": { dex: 835, gen: 8 },
  "Yungoos": { dex: 734, gen: 7 },
  "Yveltal": { dex: 717, gen: 6 },
  "Zacian": { dex: 888, gen: 8 },
  "Zamazenta": { dex: 889, gen: 8 },
  "Zekrom": { dex: 644, gen: 5 },
  "Zeraora": { dex: 807, gen: 7 },
  "Zigzagoon": { dex: 263, gen: 3 },
  "Zoroark": { dex: 571, gen: 5 },
  "Zorua": { dex: 570, gen: 5 },
  "Zweilous": { dex: 634, gen: 5 },
  "Zygarde": { dex: 718, gen: 6 },
};

/** All canonical species in the v1 seed, sorted. */
export const KNOWN_SPECIES: readonly string[] = Object.keys(SPECIES_DEX);
