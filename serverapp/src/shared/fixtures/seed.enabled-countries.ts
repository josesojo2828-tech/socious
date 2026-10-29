import { PrismaClient } from "@prisma/client";

export interface SeedLogger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export const BASE_COUNTRIES = [
  {
    code: "VE",
    name: "Venezuela",
    phoneCode: "+58",
    flagEmoji: "🇻🇪",
    currency: "VES",
    isActive: true,
  },
  {
    code: "MX",
    name: "México",
    phoneCode: "+52",
    flagEmoji: "🇲🇽",
    currency: "MXN",
    isActive: true,
  },
  {
    code: "AR",
    name: "Argentina",
    phoneCode: "+54",
    flagEmoji: "🇦🇷",
    currency: "ARS",
    isActive: true,
  },
  {
    code: "US",
    name: "Estados Unidos",
    phoneCode: "+1",
    flagEmoji: "🇺🇸",
    currency: "USD",
    isActive: true,
  },
  {
    code: "CO",
    name: "Colombia",
    phoneCode: "+57",
    flagEmoji: "🇨🇴",
    currency: "COP",
    isActive: true,
  },
  {
    code: "CL",
    name: "Chile",
    phoneCode: "+56",
    flagEmoji: "🇨🇱",
    currency: "CLP",
    isActive: true,
  },
  {
    code: "ES",
    name: "España",
    phoneCode: "+34",
    flagEmoji: "🇪🇸",
    currency: "EUR",
    isActive: true,
  },
];

export async function SeedEnabledCountries(
  prisma: PrismaClient,
  logger?: SeedLogger,
): Promise<{ total: number; inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const country of BASE_COUNTRIES) {
    const existing = await prisma.enabledCountry.findUnique({
      where: { code: country.code },
    });

    if (!existing) {
      await prisma.enabledCountry.create({
        data: country,
      });
      inserted++;
    } else {
      await prisma.enabledCountry.update({
        where: { code: country.code },
        data: {
          name: country.name,
          phoneCode: country.phoneCode,
          flagEmoji: country.flagEmoji,
          currency: country.currency,
        },
      });
      updated++;
    }
  }

  return { total: BASE_COUNTRIES.length, inserted, updated };
}
