const express = require("express");
const router = express.Router();
const { CosmosClient } = require("@azure/cosmos");
const mongoose = require("mongoose");
const Device = require("../models/Device");
const { getTelemetryDataByDeviceName } = require("../services/cosmosService");

// CosmosDB Config from environment variables
const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const databaseId = process.env.COSMOSDB_DATABASE;
const containerId = process.env.COSMOSDB_CONTAINER;

// Log CosmosDB configuration (excluding key for security)
console.log("CosmosDB Configuration:");
console.log(`Endpoint: ${endpoint ? endpoint.substring(0, 15) + "..." : "Not set"}`);
console.log(`Database ID: ${databaseId || "Not set"}`);
console.log(`Container ID: ${containerId || "Not set"}`);

// Create a client with the credentials
const client = new CosmosClient({ endpoint, key });

// 🔥 **Global function to fetch `deviceName` from MongoDB**
const fetchDeviceName = async (deviceId) => {
    try {
        const device = await Device.findById(deviceId);
        return device ? device.deviceName : null;
    } catch (error) {
        console.error(`❌ Error fetching device name for ID: ${deviceId}`, error);
        return null;
    }
};

// 🛠 **Diagnostic Route**
router.get("/diagnostic", async (req, res) => {
    try {
        console.log("🔍 Running CosmosDB diagnostic...");

        // Ensure all required connection parameters are present
        if (!endpoint || !key || !databaseId || !containerId) {
            return res.status(500).json({
                error: "CosmosDB configuration incomplete",
                missingParams: {
                    endpoint: !endpoint,
                    key: !key,
                    databaseId: !databaseId,
                    containerId: !containerId,
                },
            });
        }

        // Access the database and container
        const database = client.database(databaseId);
        const container = database.container(containerId);

        // Query the latest 100 records
        const query = { query: "SELECT TOP 100 * FROM c ORDER BY c._ts DESC" };
        const { resources: allData } = await container.items.query(query).fetchAll();

        // Count total records
        const countQuery = { query: "SELECT VALUE COUNT(1) FROM c" };
        const { resources: countResult } = await container.items.query(countQuery).fetchAll();
        const totalCount = countResult?.[0] || 0;

        // Fetch all unique device names
        const deviceQuery = { query: "SELECT DISTINCT VALUE c.device FROM c" };
        const { resources: deviceNames } = await container.items.query(deviceQuery).fetchAll();

        console.log(`Found ${allData.length} records, total count: ${totalCount}`);
        console.log(`Device Names in DB: ${JSON.stringify(deviceNames)}`);

        // Return diagnostic information
        res.json({
            status: "success",
            connectionInfo: {
                endpoint: endpoint ? endpoint.substring(0, 15) + "..." : "Not set",
                databaseId,
                containerId,
            },
            totalRecords: totalCount,
            deviceNames,
            sampleData: allData.length > 0 ? allData[0] : null,
            data: allData,
        });
    } catch (error) {
        console.error("❌ Diagnostic error:", error);
        res.status(500).json({ status: "error", message: error.message, stack: error.stack });
    }
});

// 📡 **Get Latest Telemetry Entry**
router.get("/latest/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        const database = client.database(databaseId);
        const container = database.container(containerId);
        console.log(`🔄 Fetching latest telemetry for device: ${deviceId}`);
        const device = await Device.findById(deviceId);
        console.log(`hii???Container for device: ${device.deviceName}`);

        // Skip MongoDB validation
        console.log("⚠️ Skipping MongoDB validation");
        // Fetch latest telemetry data from CosmosDB
    
        let latestData = await getTelemetryDataByDeviceName(device.deviceName , container);

        if (!latestData) {
            return res.json({ message: "No telemetry data available" });
        }

        res.json(latestData);
    } catch (error) {
        console.error("❌ Error fetching latest telemetry:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 🔄 **Get Realtime Telemetry Data**
router.get("/realtime/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`📡 Fetching realtime telemetry for device: ${deviceId}`);

        const deviceName = await fetchDeviceName(deviceId);
        if (!deviceName) {
            return res.status(404).json({ error: "Device not found" });
        }

        const database = client.database(databaseId);
        const container = database.container(containerId);
        console.log(`___________________Container for device: ${container}`);

        const query = { 
            query: "SELECT TOP 20 * FROM c WHERE c.device = @deviceName ORDER BY c._ts DESC", 
            parameters: [{ name: "@deviceName", value: deviceName }] };
        const { resources: recentData } = await container.items.query(query).fetchAll();

        if (recentData.length === 0) {
            return res.json([]);
        }

        res.json(
            recentData
                .map(data => ({
                    timestamp: new Date(data._ts * 1000).toISOString(),
                    temperature: data.temperature || data.temp || 0,
                    humidity: data.humidity || data.humid || 0,
                    oilLevel: data.oil_level || data.oilLevel || 0,
                    openAlerts: data.open_alerts || data.alerts || 0,
                }))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        );
    } catch (error) {
        console.error("❌ Error fetching realtime data:", error);
        res.json([]);
    }
});

// 📊 **Get Historical Telemetry Data**
router.get("/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`📜 Fetching historical telemetry for device: ${deviceId}`);

        const deviceName = await fetchDeviceName(deviceId);
        if (!deviceName) {
            return res.status(404).json({ error: "Device not found" });
        }

        const database = client.database(databaseId);
        const container = database.container(containerId);

        const query = { query: "SELECT TOP 20 * FROM c WHERE c.device = @deviceName ORDER BY c._ts DESC", parameters: [{ name: "@deviceName", value: deviceName }] };
        const { resources: historicalData } = await container.items.query(query).fetchAll();

        if (historicalData.length === 0) {
            return res.json([]);
        }

        res.json(
            historicalData.map(data => ({
                timestamp: new Date(data._ts * 1000).toISOString(),
                temperature: data.temperature || data.temp || 0,
                humidity: data.humidity || data.humid || 0,
                oilLevel: data.oil_level || data.oilLevel || 0,
                openAlerts: data.open_alerts || data.alerts || 0,
            }))
        );
    } catch (error) {
        console.error("❌ Error fetching historical data:", error);
        res.json([]);
    }
});
// ✅ New route: Get saved latest telemetry by deviceName (for frontend)
router.get("/saved-latest/:deviceName", async (req, res) => {
    try {
        const { deviceName } = req.params;
        console.log(`🔍 [API] Fetching saved-latest telemetry for: ${deviceName}`);

        // Fetch latest 1 entry from Cosmos DB
        const database = client.database(databaseId);
        const container = database.container(containerId);

        const query = {
            query: "SELECT TOP 1 * FROM c WHERE c.device = @deviceName ORDER BY c._ts DESC",
            parameters: [{ name: "@deviceName", value: deviceName }]
        };
        const { resources } = await container.items.query(query).fetchAll();

        if (!resources || resources.length === 0) {
            return res.status(404).json({ message: "No telemetry data found for this device in CosmosDB." });
        }

        const telemetry = resources[0];

        // Format and return
        const result = {
            timestamp: new Date(telemetry._ts * 1000).toISOString(),
            temperature: telemetry.temperature || telemetry.temp || 0,
            humidity: telemetry.humidity || telemetry.humid || 0,
            oilLevel: telemetry.oil_level || telemetry.oilLevel || 0,
            openAlerts: telemetry.open_alerts || telemetry.alerts || 0,
        };

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /saved-latest/:deviceName:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/threshold/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const { metric, threshold } = req.body;
  
    try {
      // Optionally save in DB
      await saveThresholdToDB(deviceId, metric, threshold);
  
      // Send update to device via Azure IoT Hub
      await azureService.sendConfigUpdate(deviceId, {
        [metric]: threshold,
      });
  
      res.status(200).json({ message: 'Threshold sent to device' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send threshold' });
    }
  });

module.exports = router;
