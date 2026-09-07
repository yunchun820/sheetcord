export interface Settings {
  enabled: boolean;
  showEmoji: boolean;
  sidebarCollapsed: boolean;
}

export const defaults: Settings = { enabled: true, showEmoji: true, sidebarCollapsed: false };
export const settingsKey = 'sheetcord.settings';

export function sanitizeSettings(value: unknown): Settings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
    [key, typeof raw[key] === 'boolean' ? raw[key] : fallback])) as unknown as Settings;
}

export interface SettingsStore {
  read(): Promise<Settings>;
  write(patch: Partial<Settings>): Promise<void>;
  subscribe(listener: (settings: Settings) => void): () => void;
}

export function chromeSettings(): SettingsStore {
  return {
    async read() {
      return sanitizeSettings((await chrome.storage.local.get(settingsKey))[settingsKey]);
    },
    async write(patch) {
      const previous = sanitizeSettings((await chrome.storage.local.get(settingsKey))[settingsKey]);
      await chrome.storage.local.set({ [settingsKey]: sanitizeSettings({ ...previous, ...patch }) });
    },
    subscribe(listener) {
      const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area === 'local' && changes[settingsKey]) listener(sanitizeSettings(changes[settingsKey].newValue));
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    },
  };
}
