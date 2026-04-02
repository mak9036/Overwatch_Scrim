export const APP_SESSION_CHANGED_EVENT = "app-session-changed";

export const notifyAppSessionChanged = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(APP_SESSION_CHANGED_EVENT));
};
