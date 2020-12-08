import AuthenticationMiddleware from "../../backend/src/authentication/AuthenticationMiddleware";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const mockRequest: Partial<Request> = {
  headers: { authorization: "" },
};
const mockResponse: Partial<Response> = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
};
test("returns 401 if authentication token is not present in authorization header", () => {
  const nexthandler = jest.fn();
  AuthenticationMiddleware(
    mockRequest as Request,
    mockResponse as Response,
    nexthandler
  );
  expect(nexthandler).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(401);
});

test("calls next() if a proper token was passed", () => {
  const nexthandler = jest.fn();

  mockRequest.headers.authorization = jwt.sign(
    {
      username: "testuser",
      id: "testid",
    },
    "some-secret"
  );
  AuthenticationMiddleware(
    mockRequest as Request,
    mockResponse as Response,
    nexthandler
  );
  expect(nexthandler).toHaveBeenCalled();
  expect(nexthandler).toHaveBeenCalledWith(
    expect.objectContaining({
      user: { iat: expect.any(Number), username: "testuser", id: "testid" },
    })
  );
});
