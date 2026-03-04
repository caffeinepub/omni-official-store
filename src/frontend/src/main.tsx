import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "../index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Capture admin token from URL hash BEFORE any navigation or login flow
// This must run at startup so the token is in sessionStorage even after II redirect
(function captureAdminToken() {
  try {
    const TOKEN_KEY = "caffeineAdminToken";
    // Only capture if not already stored
    if (sessionStorage.getItem(TOKEN_KEY)) return;
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;
    // Try parsing the full hash as params (handles #caffeineAdminToken=xxx)
    const hashContent = hash.substring(1);
    const params = new URLSearchParams(hashContent);
    const token = params.get(TOKEN_KEY);
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // ignore
  }
})();

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
