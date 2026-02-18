import { storage } from 'wxt/utils/storage';

export type Config = {
  pat: string;
  gistId?: string;
};

const pat = storage.defineItem<string>('local:pat');
const gistId = storage.defineItem<string>('local:gistId');

export const getConfig = async (): Promise<Config | null> => {
  const [patValue, gistIdValue] = await Promise.all([pat.getValue(), gistId.getValue()]);

  if (patValue == null || patValue === '') {
    return null;
  }

  return {
    pat: patValue,
    gistId: gistIdValue ?? undefined,
  };
};

export const savePat = async (data: { pat: string }): Promise<void> => {
  await pat.setValue(data.pat);
};
