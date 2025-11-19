import "server-only";

type Messages = Record<string, string>;

const dictionaries: { [key: string]: () => Promise<Messages> } = {
  en: () => import("@/dictionaries/en.json").then((module) => module.default),
  fr: () => import("@/dictionaries/fr.json").then((module) => module.default),
  rw: () => import("@/dictionaries/rw.json").then((module) => module.default),
};

export const getDictionary = async (lang: string = "en") => {
  const load = dictionaries[lang];
  if (load) {
    return load();
  }
  // Fallback to English
  return dictionaries.en();
};

