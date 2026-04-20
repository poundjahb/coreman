import { useState } from "react";
import { AppShell, Group, NavLink, Text } from "@mantine/core";
import { DashboardScreen } from "./screens/DashboardScreen";
import { ReceptionistScreen } from "./screens/ReceptionistScreen";

type Screen = "dashboard" | "receptionist";

export function App(): JSX.Element {
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");

  return (
    <AppShell
      header={{ height: 56 }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={700} size="sm" c="blue.8" style={{ letterSpacing: "0.04em" }}>
            Correspondence Management
          </Text>
          <Group gap="xs">
            <NavLink
              label="Dashboard"
              active={activeScreen === "dashboard"}
              onClick={() => setActiveScreen("dashboard")}
              style={{ borderRadius: 8 }}
            />
            <NavLink
              label="Receptionist"
              active={activeScreen === "receptionist"}
              onClick={() => setActiveScreen("receptionist")}
              style={{ borderRadius: 8 }}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {activeScreen === "dashboard" && <DashboardScreen />}
        {activeScreen === "receptionist" && <ReceptionistScreen />}
      </AppShell.Main>
    </AppShell>
  );
}
