import { defineExtensionMessaging } from '@webext-core/messaging';

export type Config = {
  pat: string;
  gistId: string;
};

export type Note = {
  content: string;
  updatedAt: string;
};

export interface ProtocolMap {
  getNote(key: string): Note | null;
  saveNote(data: { key: string; content: string }): void;
  getConfig(): Config | null;
  saveConfig(config: Config): void;
  createGist(): string;
  testConnection(): boolean;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
