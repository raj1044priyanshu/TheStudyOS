import { DEFAULT_APP_SETTINGS_VALUES } from "@/lib/default-app-settings";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppSettingsModel } from "@/models/AppSettings";

export type AppSettingsPayload = typeof DEFAULT_APP_SETTINGS_VALUES;

function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T> | null | undefined): T {
  if (!overrides) {
    return defaults;
  }

  const result = { ...defaults } as Record<string, unknown>;

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const defaultValue = result[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      defaultValue &&
      typeof defaultValue === "object" &&
      !Array.isArray(defaultValue)
    ) {
      result[key] = deepMerge(defaultValue as Record<string, unknown>, value as Record<string, unknown>);
      return;
    }

    result[key] = value;
  });

  return result as T;
}

export function mergeWithDefaultAppSettings(value: Partial<AppSettingsPayload> | null | undefined) {
  return deepMerge(
    toSerializable(DEFAULT_APP_SETTINGS_VALUES) as AppSettingsPayload,
    (value ? toSerializable(value) : null) as Partial<AppSettingsPayload> | null
  );
}

export function mergeAppSettings(
  current: Partial<AppSettingsPayload> | null | undefined,
  overrides: Partial<AppSettingsPayload> | null | undefined
) {
  const base = mergeWithDefaultAppSettings(current);
  return deepMerge(base, (overrides ? toSerializable(overrides) : null) as Partial<AppSettingsPayload> | null);
}

export async function getAppSettings() {
  await connectToDatabase();

  const settings = await AppSettingsModel.findOneAndUpdate(
    { key: "site" },
    {
      $setOnInsert: {
        key: "site",
        ...DEFAULT_APP_SETTINGS_VALUES
      }
    },
    {
      upsert: true,
      returnDocument: "after"
    }
  ).lean();

  return mergeWithDefaultAppSettings(settings);
}

export async function getPublicAppSettings() {
  try {
    return await getAppSettings();
  } catch (error) {
    console.error("Failed to load app settings, using defaults", error);
    return mergeWithDefaultAppSettings(null);
  }
}
