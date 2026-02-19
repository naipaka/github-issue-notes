import { defineExtensionMessaging } from '@webext-core/messaging';
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

export type ClientConfig = {
  hasPat: boolean;
  gistId?: string;
  pat?: string;
};

export interface ProtocolMap {
  getNote(key: string): Note | null;
  saveNote(data: { key: string; content: string }): void;
  getConfig(): ClientConfig;
  savePat(data: { pat: string }): void;
  connectGist(): ConnectResult;
  checkConnection(): CheckConnectionResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
