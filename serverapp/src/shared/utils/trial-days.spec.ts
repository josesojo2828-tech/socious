import {
  TRIAL_DAYS_FALLBACK,
  TRIAL_DAYS_SETTING_KEY,
  resolveTrialDays,
} from "./trial-days";

const makePrisma = (
  opts: { value?: string | null; throws?: boolean } = {},
) =>
  ({
    systemSetting: {
      findUnique: jest.fn(async () => {
        if (opts.throws) throw new Error("db down");
        return opts.value === undefined || opts.value === null
          ? null
          : { value: opts.value };
      }),
    },
  }) as any;

describe("resolveTrialDays", () => {
  const originalEnv = process.env[TRIAL_DAYS_SETTING_KEY];

  afterEach(() => {
    if (originalEnv === undefined) delete process.env[TRIAL_DAYS_SETTING_KEY];
    else process.env[TRIAL_DAYS_SETTING_KEY] = originalEnv;
  });

  it("reads the platform setting the admin edits", async () => {
    process.env[TRIAL_DAYS_SETTING_KEY] = "30";

    await expect(resolveTrialDays(makePrisma({ value: "45" }))).resolves.toBe(45);
  });

  it("falls back to the env value when the setting was never saved", async () => {
    process.env[TRIAL_DAYS_SETTING_KEY] = "30";

    await expect(resolveTrialDays(makePrisma())).resolves.toBe(30);
  });

  it("falls back to 14 days when neither the setting nor the env exists", async () => {
    delete process.env[TRIAL_DAYS_SETTING_KEY];

    await expect(resolveTrialDays(makePrisma())).resolves.toBe(TRIAL_DAYS_FALLBACK);
  });

  it("ignores a non-positive or non-numeric setting and keeps the env value", async () => {
    process.env[TRIAL_DAYS_SETTING_KEY] = "21";

    await expect(resolveTrialDays(makePrisma({ value: "no-es-un-numero" }))).resolves.toBe(21);
    await expect(resolveTrialDays(makePrisma({ value: "0" }))).resolves.toBe(21);
  });

  it("keeps the env fallback when the setting lookup fails", async () => {
    process.env[TRIAL_DAYS_SETTING_KEY] = "7";

    await expect(resolveTrialDays(makePrisma({ throws: true }))).resolves.toBe(7);
  });

  it("clamps to a sane range", async () => {
    await expect(resolveTrialDays(makePrisma({ value: "0.4" }), {})).resolves.toBe(1);
    await expect(resolveTrialDays(makePrisma({ value: "9999" }), {})).resolves.toBe(365);
  });
});
