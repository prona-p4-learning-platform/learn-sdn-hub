/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testRegex: "/test/unit/.*.test.ts",
  moduleFileExtensions: ["ts", "tsx", "js"],
};
