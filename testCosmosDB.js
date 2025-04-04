require("dotenv").config();
const { CosmosClient } = require("@azure/cosmos");

// Get configuration from environment variables
const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const databaseId = process.env.COSMOSDB_DATABASE;
const containerId = process.env.COSMOSDB_CONTAINER;

console.log("CosmosDB Connection Test");
console.log("=======================");
console.log(`Endpoint: ${endpoint ? endpoint.substring(0, 15) + '...' : 'Not set'}`);
console.log(`Database ID: ${databaseId || 'Not set'}`);
console.log(`Container ID: ${containerId || 'Not set'}`);

async function testConnection() {
  try {
    console.log("\nTesting connection...");
    
    // Create a client
    const client = new CosmosClient({ endpoint, key });
    console.log("Client created successfully");
    
    // Test database
    const database = client.database(databaseId);
    console.log("Accessing database...");
    
    // Test container
    const container = database.container(containerId);
    console.log("Accessing container...");
    
    // Try a simple query
    console.log("Running test query...");
    const query = {
      query: "SELECT TOP 5 * FROM c"
    };
    
    const { resources } = await container.items.query(query).fetchAll();
    console.log(`Query successful! Found ${resources.length} records.`);
    
    if (resources.length > 0) {
      console.log("\nSample record structure:");
      console.log(JSON.stringify(resources[0], null, 2));
      
      console.log("\nFields found in sample record:");
      Object.keys(resources[0]).forEach(key => {
        console.log(`- ${key}: ${typeof resources[0][key]}`);
      });
    }
    
    // Get all device IDs
    console.log("\nLooking for device_id field in records...");
    const deviceQuery = {
      query: "SELECT DISTINCT VALUE c.device_id FROM c"
    };
    
    const { resources: deviceIds } = await container.items.query(deviceQuery).fetchAll();
    console.log(`Found ${deviceIds.length} unique device IDs: ${JSON.stringify(deviceIds)}`);
    
    console.log("\n✅ CONNECTION TEST SUCCESSFUL!");
  } catch (error) {
    console.error("\n❌ CONNECTION TEST FAILED!");
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
  }
}

testConnection();
