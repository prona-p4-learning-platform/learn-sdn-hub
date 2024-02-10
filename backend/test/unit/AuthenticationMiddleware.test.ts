import AuthenticationMiddleware from "../../src/authentication/AuthenticationMiddleware";
import { Request, Response, Send } from "express";
import jwt from "jsonwebtoken";
import { jest, expect, test } from "@jest/globals";

const mockRequest: Partial<Request> = {
  headers: { authorization: "" },
};
const mockResponse: Partial<Response> = {
  status: jest.fn().mockReturnThis() as (
    code: number,
  ) => Response<unknown, Record<string, unknown>>,
  json: jest.fn().mockReturnThis() as Send,
};
test("returns 401 if authentication token is not present in authorization header", () => {
  const nexthandler = jest.fn();
  AuthenticationMiddleware(
    mockRequest as Request,
    mockResponse as Response,
    nexthandler,
  );
  expect(nexthandler).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(401);
});

test("calls next() if a proper token was passed", () => {
  const nexthandler = jest.fn();

  if (!mockRequest.headers) mockRequest.headers = {};

  mockRequest.headers.authorization = jwt.sign(
    {
      username: "testuser",
      id: "testid",
    },
    /* TODO: replace secret */
    "some-secret",
  );
  AuthenticationMiddleware(
    mockRequest as Request,
    mockResponse as Response,
    nexthandler,
  );
  expect(nexthandler).toHaveBeenCalled();
  expect(mockRequest).toMatchObject({
    user: { iat: expect.any(Number), username: "testuser", id: "testid" },
  });
});
