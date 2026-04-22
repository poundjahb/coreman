import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import { Notifications } from "@mantine/notifications";
import { App } from "./App";
import "./styles.css";

const theme = createTheme({
  fontFamily: '"Aptos", "Segoe UI", sans-serif',
  primaryColor: "blue"
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" autoClose={5000} />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
