import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "store_app_ui_theme";
const LEGACY_ADMIN_KEY = "store_app_admin_ui_theme";

function readInitialTheme() {
  try {
    const v =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_ADMIN_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const UiThemeContext = createContext(null);

export function UiThemeProvider({ children }) {
  const [uiTheme, setUiTheme] = useState(readInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, uiTheme);
    } catch {
      /* ignore */
    }
  }, [uiTheme]);

  const toggleUiTheme = useCallback(() => {
    setUiTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ uiTheme, setUiTheme, toggleUiTheme }),
    [uiTheme, toggleUiTheme],
  );

  return (
    <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>
  );
}

export function useUiTheme() {
  const ctx = useContext(UiThemeContext);
  if (!ctx) {
    throw new Error("useUiTheme phải dùng bên trong UiThemeProvider");
  }
  return ctx;
}
