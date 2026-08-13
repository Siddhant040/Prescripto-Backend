import { describe, it, expect } from "vitest";
import mongoose from "mongoose";

describe("Test environment", () => {
  it("connects to the test database", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});