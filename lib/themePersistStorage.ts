import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

const memory = new Map<string, string>();

const memoryStorage: StateStorage = {
  getItem: async (name) => memory.get(name) ?? null,
  setItem: async (name, value) => {
    memory.set(name, value);
  },
  removeItem: async (name) => {
    memory.delete(name);
  },
};

const webStorage: StateStorage = {
  getItem: async (name) => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: async (name) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

function createNativeHybridStorage(): StateStorage {
  let preferMemory = false;

  return {
    getItem: async (name) => {
      if (preferMemory) return memoryStorage.getItem(name);
      try {
        return await AsyncStorage.getItem(name);
      } catch {
        preferMemory = true;
        return memoryStorage.getItem(name);
      }
    },
    setItem: async (name, value) => {
      if (preferMemory) {
        await memoryStorage.setItem(name, value);
        return;
      }
      try {
        await AsyncStorage.setItem(name, value);
      } catch {
        preferMemory = true;
        await memoryStorage.setItem(name, value);
      }
    },
    removeItem: async (name) => {
      if (preferMemory) {
        await memoryStorage.removeItem(name);
        return;
      }
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        preferMemory = true;
        await memoryStorage.removeItem(name);
      }
    },
  };
}

/** Web uses localStorage; native uses AsyncStorage with in-memory fallback if the native module is unavailable. */
export const themePersistStorage: StateStorage =
  Platform.OS === "web" ? webStorage : createNativeHybridStorage();
