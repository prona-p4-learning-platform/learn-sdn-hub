import extractCompilationResult from "../../src/CompilationResultExtractor";
import { expect, test } from "@jest/globals";

test("it extracts errors successfully", () => {
  expect(
    extractCompilationResult(
      `/tmp/test-wHXUrU/test.p4(13):syntax error, unexpected TYPEDEF, expecting ;
      typedef
      error: 1 errors encountered, aborting compilation\n`
    )
  ).toEqual([
    {
      line: 13,
      message: "syntax error, unexpected TYPEDEF, expecting ;",
    },
  ]);
});
