const express = require("express");
const { createClient } = require("redis");
const { setTimeout } = require("timers/promises");

const app = express();
const port = 3000;

const client = createClient({ url: "redis://redis:6379" });
client.on("error", (err) => console.log("Redis Client Error", err));

const slowQuery = async () => {
  await setTimeout(3000);
  return { type: "cars", amount: 15 };
};

app.get("/data", async (_req, res) => {
  const data = await slowQuery();
  res.send(data);
});

app.get("/data_fast", async (_req, res) => {
  // Open connection to Redis
  await client.connect();

  let data;
  // Look for data in Redis
  data = JSON.parse(await client.get("data"));

  if (!data) {
    // If it is a miss we get the data again
    data = await slowQuery();
    // We save the data in Redis for subsequent requests
    await client.set("data", JSON.stringify(data));
  }

  // We close the connection to Redis
  await client.disconnect();

  res.send(data);
});

app.get("/data_fresh", async (_req, res) => {
  await client.connect();

  let data;
  data = JSON.parse(await client.get("data"));

  if (!data) {
    data = await slowQuery();
    // We save the data in Redis only for 20 seconds
    await client.setEx("data", 20, JSON.stringify(data));
  }

  await client.disconnect();

  res.send(data);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
