"use strict";

require("dotenv").config();
const connectDB        = require("./config/db");
const app              = require("./app");
const { startScheduler } = require("./jobs/scheduler");
const env              = require("./config/env");

const start = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`SmartFinance API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Start background jobs after DB is connected
  startScheduler();
};

start();
