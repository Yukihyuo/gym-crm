import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TerminalState {
  terminalId: string | null;
  setTerminal: (terminalId: string) => void;
  clearTerminal: () => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      terminalId: null,
      setTerminal: (terminalId: string) => set({ terminalId }),
      clearTerminal: () => set({ terminalId: null }),
    }),
    { name: 'config-terminal-gym' } // Nombre en LocalStorage
  )
);