const mongoDB = require("@shelf/jest-mongodb/jest-preset");
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "/test/integration/.*.test.ts",
  moduleFileExtensions: ["ts", "tsx", "js"],
  ...mongoDB,
};
