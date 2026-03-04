import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "../index.css";
import { getSecretFromHash } from "./utils/urlParams";

// Capture admin token immediately on page load — BEFORE React renders.
// This ensures the token is saved to localStorage even when Internet Identity
// redirects back to the app and the hash may look different.
(function captureAdminToken() {
  try {
    getSecretFromHash("caffeineAdminToken");
  } catch {
    // silently ignore — token capture is best-effort
  }
})();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

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
