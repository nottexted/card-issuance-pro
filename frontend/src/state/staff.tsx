import React from "react";

export type Staff = { name: string; position?: string };

const LS_KEY = "cis.staff.v1";

function readStaff(): Staff {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { name: "" };
    const parsed = JSON.parse(raw);
    return {
      name: String(parsed?.name ?? ""),
      position: parsed?.position ? String(parsed.position) : undefined,
    };
  } catch {
    return { name: "" };
  }
}

function writeStaff(staff: Staff) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(staff));
  } catch {
    /* ignore */
  }
}

const StaffCtx = React.createContext<{
  staff: Staff;
  setStaff: (next: Staff) => void;
  clearStaff: () => void;
}>({ staff: { name: "" }, setStaff: () => {}, clearStaff: () => {} });

export function StaffProvider({ children }: React.PropsWithChildren) {
  const [staff, setStaffState] = React.useState<Staff>(() => readStaff());

  const setStaff = (next: Staff) => {
    const cleaned: Staff = {
      name: (next.name || "").trim(),
      position: (next.position || "").trim() || undefined,
    };
    setStaffState(cleaned);
    writeStaff(cleaned);
  };

  const clearStaff = () => {
    setStaffState({ name: "" });
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  };

  return <StaffCtx.Provider value={{ staff, setStaff, clearStaff }}>{children}</StaffCtx.Provider>;
}

export function useStaff() {
  return React.useContext(StaffCtx);
}

