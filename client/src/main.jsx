import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./index.css";
import "./styles/globalTheme.css";
import App from "./App.jsx";
import { store } from "./store/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ThemeContextProvider from "./context/ThemeProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeContextProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </ThemeContextProvider>
    </Provider>
  </StrictMode>,
);
