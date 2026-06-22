import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { rateLimitMiddleware } from "./rate-limit.middleware.js";

function mockReq(ip = "1.2.3.4", path = "/api/projects/initiate"): Request {
  return { ip, path, headers: {} } as Request;
}

function mockRes(): Response {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe("rateLimitMiddleware", () => {
  afterEach(() => {
    delete process.env.API_RATE_LIMIT_MAX;
    delete process.env.API_RATE_LIMIT_WINDOW_MS;
  });

  it("allows requests under the limit", () => {
    process.env.API_RATE_LIMIT_MAX = "5";
    const next = vi.fn();
    rateLimitMiddleware(mockReq(), mockRes(), next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 429 when limit exceeded", () => {
    process.env.API_RATE_LIMIT_MAX = "2";
    const next = vi.fn();
    const ip = `test-${Date.now()}`;

    rateLimitMiddleware(mockReq(ip), mockRes(), next as NextFunction);
    rateLimitMiddleware(mockReq(ip), mockRes(), next as NextFunction);
    const blocked = mockRes();
    rateLimitMiddleware(mockReq(ip), blocked, next as NextFunction);

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json).toHaveBeenCalled();
  });

  it("skips non-project routes", () => {
    process.env.API_RATE_LIMIT_MAX = "1";
    const next = vi.fn();
    rateLimitMiddleware(mockReq("9.9.9.9", "/health"), mockRes(), next as NextFunction);
    rateLimitMiddleware(mockReq("9.9.9.9", "/health"), mockRes(), next as NextFunction);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
