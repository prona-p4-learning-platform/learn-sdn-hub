import APIRoutes from "../../backend/src/Api";
import request from "supertest";
import express from "express";
import { MongoClient } from "mongodb";
import MongoDBPersister from "../../backend/src/database/MongoDBPersister";
import MongoDBAuthenticationProvider from "../../backend/src/authentication/MongoDBAuthenticationProvider";

const app = express();
let connection: MongoClient = null;
let instance: MongoDBPersister = null;

beforeAll(async () => {
  connection = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await connection.db().dropCollection("users");
  } catch (err) {}

  await connection.db().collection("users").insertOne({
    username: "testuser",
    password: "testpassword",
    environments: [],
  });
  instance = new MongoDBPersister(process.env.MONGO_URL);
  app.use(APIRoutes(instance, [new MongoDBAuthenticationProvider(instance)]));
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
