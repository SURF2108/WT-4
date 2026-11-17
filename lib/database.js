"use strict";

const { MongoClient } = require("mongodb");
const { metric } = require("@vercel/functions");

const OWNER_ID = "primary";
let databasePromise;

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const error = new Error("MongoDB is not configured.");
    error.code = "MONGODB_CONFIGURATION";
    throw error;
  }

  if (!databasePromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    databasePromise = client.connect().then(async (connectedClient) => {
      const database = connectedClient.db(
        process.env.MONGODB_DB_NAME || "budget_tracker",
      );
      await Promise.all([
        database
          .collection("transactions")
          .createIndex({ ownerId: 1, month: 1, date: -1, createdAt: -1 }),
        database
          .collection("monthly_budgets")
          .createIndex({ ownerId: 1, month: 1 }, { unique: true }),
      ]);
      return database;
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

async function withDatabaseOperation(operation, callback) {
  const startedAt = performance.now();
  let outcome = "error";
  try {
    const database = await connectDatabase();
    const result = await callback(database);
    outcome = "success";
    return result;
  } catch (error) {
    if (error.code !== "MONGODB_CONFIGURATION") {
      console.error("MongoDB operation failed.", {
        operation,
        errorName: error.name || "Error",
      });
      const unavailable = new Error("The budget database is unavailable.");
      unavailable.code = "DATABASE_UNAVAILABLE";
      throw unavailable;
    }
    throw error;
  } finally {
    metric("budget.mongodb.operations", 1, { operation, outcome });
    metric("budget.mongodb.duration_ms", performance.now() - startedAt, {
      operation,
      outcome,
    });
  }
}

module.exports = { OWNER_ID, withDatabaseOperation };
