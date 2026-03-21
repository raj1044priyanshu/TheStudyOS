import { Schema, model, models } from "mongoose";
import { DEFAULT_APP_SETTINGS_VALUES } from "@/lib/default-app-settings";

const AppSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    feedbackEnabled: { type: Boolean, default: DEFAULT_APP_SETTINGS_VALUES.feedbackEnabled },
    feedbackPromptTitle: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.feedbackPromptTitle },
    feedbackPromptDescription: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.feedbackPromptDescription },
    maintenanceBanner: {
      enabled: { type: Boolean, default: DEFAULT_APP_SETTINGS_VALUES.maintenanceBanner.enabled },
      message: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.maintenanceBanner.message }
    },
    featureToggles: {
      adminDashboard: { type: Boolean, default: DEFAULT_APP_SETTINGS_VALUES.featureToggles.adminDashboard },
      feedback: { type: Boolean, default: DEFAULT_APP_SETTINGS_VALUES.featureToggles.feedback },
      errorMonitoring: { type: Boolean, default: DEFAULT_APP_SETTINGS_VALUES.featureToggles.errorMonitoring }
    },
    errorAlerts: {
      severityThreshold: {
        type: String,
        enum: ["info", "warning", "error", "fatal"],
        default: DEFAULT_APP_SETTINGS_VALUES.errorAlerts.severityThreshold
      },
      cooldownMinutes: { type: Number, default: DEFAULT_APP_SETTINGS_VALUES.errorAlerts.cooldownMinutes }
    },
    landing: {
      heroEyebrow: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.heroEyebrow },
      heroTitle: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.heroTitle },
      heroDescription: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.heroDescription },
      heroPanelEyebrow: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.heroPanelEyebrow },
      heroPanelTitle: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.heroPanelTitle },
      platformEyebrow: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.platformEyebrow },
      platformTitle: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.platformTitle },
      platformDescription: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.platformDescription },
      trustEyebrow: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.trustEyebrow },
      trustTitle: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.trustTitle },
      trustDescription: { type: String, default: DEFAULT_APP_SETTINGS_VALUES.landing.trustDescription },
      highlights: {
        type: [
          {
            title: { type: String, required: true },
            description: { type: String, required: true }
          }
        ],
        default: DEFAULT_APP_SETTINGS_VALUES.landing.highlights
      },
      features: {
        type: [
          {
            title: { type: String, required: true },
            iconKey: { type: String, required: true },
            description: { type: String, required: true }
          }
        ],
        default: DEFAULT_APP_SETTINGS_VALUES.landing.features
      },
      testimonials: {
        type: [
          {
            name: { type: String, required: true },
            text: { type: String, required: true }
          }
        ],
        default: DEFAULT_APP_SETTINGS_VALUES.landing.testimonials
      }
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const AppSettingsModel = models.AppSettings || model("AppSettings", AppSettingsSchema);
