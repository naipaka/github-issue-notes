import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Config } from './storage';
import type { Note } from './notes';

export type ConnectResult = {
  gistId: string;
  gistUrl: string;
  reused: boolean;
};

export type CheckConnectionResult = {
  connected: boolean;
  gistUrl?: string;
};

export interface ProtocolMap {
  getNote(key: string): Note | null;
  saveNote(data: { key: string; content: string }): void;
  getConfig(): Config | null;
  savePat(data: { pat: string }): void;
  connectGist(): ConnectResult;
  checkConnection(): CheckConnectionResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
