import mongoDB from "@shelf/jest-mongodb/jest-preset";
console.log(mongoDB);
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "/test/integration/.*.test.ts",
  moduleFileExtensions: ["ts", "tsx", "js"],
  ...mongoDB,
};
