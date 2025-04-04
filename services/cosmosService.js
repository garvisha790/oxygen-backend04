const getTelemetryDataByDeviceName = async (deviceName) => {
  try {
      if (!container) {
          console.error("❌ Container not initialized. Call connectCosmosDB() first.");
          return [];
      }

      // Fetch telemetry data for the given device name
      const querySpec = {
          query: "SELECT TOP 1 * FROM c WHERE c.device = @deviceName ORDER BY c.timestamp DESC",
          parameters: [{ name: "@deviceName", value: deviceName }]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? resources[0] : null;
  } catch (error) {
      console.error("❌ Error Fetching Telemetry Data:", error.message);
      return null;
  }
};

module.exports = { getTelemetryDataByDeviceName };
