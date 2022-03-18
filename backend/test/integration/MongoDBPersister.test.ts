import { MongoClient } from "mongodb";
import MongoDBPersister from "../../src/database/MongoDBPersister";

let instance: MongoDBPersister = null;
let connection: MongoClient = null;

beforeAll(async () => {
  connection = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  instance = new MongoDBPersister(process.env.MONGO_URL);
  try {
    await connection.db().dropCollection("users");
  } catch (err) {}
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
    "some-instance"
  );
  const result = await connection
    .db()
    .collection("users")
    .findOne({ username: "testuser" });
  expect(result.environments).toEqual([
    { identifier: "environmentXYZ" },
    { identifier: "some-uuid", description: "some-description" },
  ]);
});

afterAll(async () => {
  await connection.close();
  await instance.close();
});
