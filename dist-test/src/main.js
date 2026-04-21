import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import { App } from "./App";
import "./styles.css";
const theme = createTheme({
    fontFamily: '"Aptos", "Segoe UI", sans-serif',
    primaryColor: "blue"
});
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(MantineProvider, { theme: theme, children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }) }));
