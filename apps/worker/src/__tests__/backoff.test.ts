import { describe, expect, it } from "vitest";
import { computeBackoffDelaySeconds } from "../lib/backoff";

describe("computeBackoffDelaySeconds", () => {
  it("FIXED: returns the same delay regardless of attempt number", () => {
    expect(computeBackoffDelaySeconds("FIXED", 1, 30, 3600)).toBe(30);
    expect(computeBackoffDelaySeconds("FIXED", 5, 30, 3600)).toBe(30);
    expect(computeBackoffDelaySeconds("FIXED", 20, 30, 3600)).toBe(30);
  });

  it("LINEAR: grows linearly with attempt number", () => {
    expect(computeBackoffDelaySeconds("LINEAR", 1, 30, 3600)).toBe(30);
    expect(computeBackoffDelaySeconds("LINEAR", 2, 30, 3600)).toBe(60);
    expect(computeBackoffDelaySeconds("LINEAR", 3, 30, 3600)).toBe(90);
  });

  it("EXPONENTIAL: doubles each attempt", () => {
    expect(computeBackoffDelaySeconds("EXPONENTIAL", 1, 30, 3600)).toBe(30);
    expect(computeBackoffDelaySeconds("EXPONENTIAL", 2, 30, 3600)).toBe(60);
    expect(computeBackoffDelaySeconds("EXPONENTIAL", 3, 30, 3600)).toBe(120);
    expect(computeBackoffDelaySeconds("EXPONENTIAL", 4, 30, 3600)).toBe(240);
  });

  it("caps every strategy at maxDelaySeconds", () => {
    expect(computeBackoffDelaySeconds("LINEAR", 200, 30, 3600)).toBe(3600);
    expect(computeBackoffDelaySeconds("EXPONENTIAL", 20, 30, 3600)).toBe(3600);
    expect(computeBackoffDelaySeconds("FIXED", 1, 5000, 3600)).toBe(3600);
  });
});
