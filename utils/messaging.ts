import { defineExtensionMessaging } from '@webext-core/messaging';

export type Config = {
  pat: string;
  gistId?: string;
};

export type Note = {
  content: string;
  updatedAt: string;
};

export type ConnectResult = {
  gistId: string;
  gistUrl: string;
  reused: boolean;
};

export interface ProtocolMap {
  getNote(key: string): Note | null;
  saveNote(data: { key: string; content: string }): void;
  getConfig(): Config | null;
  savePat(data: { pat: string }): void;
  connectGist(): ConnectResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
