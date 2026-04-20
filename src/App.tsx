import { Box, Tabs, Text } from "@mantine/core";
import { DashboardScreen } from "./screens/DashboardScreen";
import { ReceptionistScreen } from "./screens/ReceptionistScreen";

export function App(): JSX.Element {
  return (
    <Box
      style={{
        width: "min(1200px, 94vw)",
        margin: "2rem auto",
        paddingBottom: "2rem"
      }}
    >
      <Tabs defaultValue="dashboard" variant="outline" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="dashboard">
            <Text fw={600}>Dashboard</Text>
          </Tabs.Tab>
          <Tabs.Tab value="receptionist">
            <Text fw={600}>Receptionist Intake</Text>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard">
          <DashboardScreen />
        </Tabs.Panel>

        <Tabs.Panel value="receptionist">
          <ReceptionistScreen />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
