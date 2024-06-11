import APIRoutes from "../../src/Api";
import request from "supertest";
import express from "express";
import { MongoClient } from "mongodb";
import MongoDBPersister from "../../src/database/MongoDBPersister";
import MongoDBAuthenticationProvider from "../../src/authentication/MongoDBAuthenticationProvider";
import LocalVMProvider from "../../src/providers/LocalVMProvider";
import { beforeAll, describe, it, expect, afterAll } from "@jest/globals";

const app = express();
let connection: MongoClient;
let instance: MongoDBPersister;

beforeAll(async () => {
  const ENV_MONGO_URL = process.env.MONGO_URL;

  if (!ENV_MONGO_URL) throw new Error("MongoDB url not provided (MONGO_URL).");

  connection = await MongoClient.connect(ENV_MONGO_URL);
  try {
    await connection.db().dropCollection("users");
  } catch (err) {
    /* */
  }

  await connection.db().collection("users").insertOne({
    username: "testuser",
    password: "testpassword",
    environments: [],
  });
  instance = new MongoDBPersister(ENV_MONGO_URL);
  app.use(
    APIRoutes(
      instance,
      [new MongoDBAuthenticationProvider(instance)],
      new LocalVMProvider(),
    ),
  );
});

describe("/api/user", () => {
  it("returns 401 if authentication credentials are invalid", async () => {
    const result = await request(app)
      .post("/api/user/login")
      .send({ username: "testuser", password: "wrongpassword" });
    expect(result.status).toBe(401);
  });

  it("returns 200 and token in body payload if authentication credentials are valid", async () => {
    const result = await request(app)
      .post("/api/user/login")
      .send({ username: "testuser", password: "testpassword" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      username: "testuser",
      token: expect.any(String),
    });
  });

  afterAll(async () => {
    await instance.close();
    await connection.close();
  });
});
