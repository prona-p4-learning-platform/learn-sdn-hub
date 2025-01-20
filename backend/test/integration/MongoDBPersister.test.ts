import { MongoClient } from "mongodb";
import MongoDBPersister from "../../src/database/MongoDBPersister";
import { beforeAll, it, expect, afterAll } from "@jest/globals";

let instance: MongoDBPersister;
let connection: MongoClient;

beforeAll(async () => {
  const ENV_MONGO_URL = process.env.MONGO_URL;

  if (!ENV_MONGO_URL) throw new Error("MongoDB url not provided (MONGO_URL).");

  connection = await MongoClient.connect(ENV_MONGO_URL);
  instance = new MongoDBPersister(ENV_MONGO_URL);
  try {
    await connection.db().dropCollection("users");
  } catch (_) {
    /* */
  }
  await connection
    .db()
    .collection("users")
    .insertOne({
      username: "testuser",
      environments: [{ identifier: "environmentXYZ" }],
    });
});

it("successfully retrieves an existing user", async () => {
  const result = await instance.GetUserAccount("testuser");
  expect(result).toEqual({
    _id: expect.anything(),
    username: "testuser",
    environments: [{ identifier: "environmentXYZ" }],
  });
});

it("successfully retrieves an existing user's registered environments", async () => {
  const result = await instance.GetUserEnvironments("testuser");
  expect(result).toMatchObject([{ identifier: "environmentXYZ" }]);
});

it("successfully adds a new environment to a user's existing list of environments", async () => {
  await instance.AddUserEnvironment(
    "testuser",
    "some-uuid",
    "some-description",
    "some-instance",
  );
  const result = await connection
    .db()
    .collection("users")
    .findOne({ username: "testuser" });
  expect(result?.environments).toEqual([
    { identifier: "environmentXYZ" },
    { identifier: "some-uuid", description: "some-description" },
  ]);
});

afterAll(async () => {
  await connection.close();
  await instance.close();
});
