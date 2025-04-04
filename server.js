require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db"); // MongoDB connection
const { fetchDiagnosticData } = require("./config/CosmosDB"); // CosmosDB connection

const authRoutes = require("./routes/authRoutes");
const plantRoutes = require("./routes/plantRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const telemetryRoutes = require("./routes/telemetryRoutes");
const azureDeviceRoutes = require("./routes/azureDevice");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB()
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1); // Exit process on failure
  });



// Optionally check connectivity on startup
fetchDiagnosticData().then((data) => {
    console.log("✅ CosmosDB connected. Total Records:", data.totalRecords);
}).catch((error) => {
    console.error("❌ CosmosDB connection failed:", error.message);
});


// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/azure", azureDeviceRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});