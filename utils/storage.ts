import { storage } from 'wxt/utils/storage';

export type Config = {
  pat: string;
  gistId: string;
};

const pat = storage.defineItem<string>('local:pat');
const gistId = storage.defineItem<string>('local:gistId');

export const getConfig = async (): Promise<Config | null> => {
  const [patValue, gistIdValue] = await Promise.all([pat.getValue(), gistId.getValue()]);

  if (patValue == null || gistIdValue == null || patValue === '' || gistIdValue === '') {
    return null;
  }

  return {
    pat: patValue,
    gistId: gistIdValue,
  };
};

export const saveConfig = async (config: Config): Promise<void> => {
  await Promise.all([pat.setValue(config.pat), gistId.setValue(config.gistId)]);
};

export const clearConfig = async (): Promise<void> => {
  await Promise.all([pat.removeValue(), gistId.removeValue()]);
};
