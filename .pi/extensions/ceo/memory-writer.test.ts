// .pi/extensions/ceo/memory-writer.test.ts

import { describe, it, expect } from "vitest";
import { MemoryWriter } from "./memory-writer.js";

describe("MemoryWriter", () => {
  describe("sanitizeOutput", () => {
    it("strips API keys matching sk- pattern", () => {
      const input = "Key is sk-abc123def456ghijklmnopqrst and done";
      const result = MemoryWriter.sanitizeOutput(input);
      expect(result).not.toContain("sk-abc123def456ghijklmnopqrst");
      expect(result).toContain("[REDACTED]");
    });

    it("strips GitHub tokens", () => {
      const input = "Token: ghp_abcdefghijklmnopqrstuvwxyz1234567890";
      const result = MemoryWriter.sanitizeOutput(input);
      expect(result).not.toContain("ghp_");
      expect(result).toContain("[REDACTED]");
    });

    it("strips Bearer tokens", () => {
      const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig";
      const result = MemoryWriter.sanitizeOutput(input);
      expect(result).not.toContain("eyJhbGciOiJIUzI1NiJ9");
      expect(result).toContain("[REDACTED]");
    });

    it("strips password assignments", () => {
      const input = 'password = "my-secret-pass123"';
      const result = MemoryWriter.sanitizeOutput(input);
      expect(result).not.toContain("my-secret-pass123");
      expect(result).toContain("[REDACTED]");
    });

    it("leaves clean text unchanged", () => {
      const input = "This is normal output with no secrets";
      const result = MemoryWriter.sanitizeOutput(input);
      expect(result).toBe(input);
    });
  });

  describe("buildLearningEntry", () => {
    it("formats a learning record", () => {
      const entry = MemoryWriter.buildLearningEntry({
        feature: "auth-system",
        pattern: "Architect produces better output with schema examples",
        area: "backend",
        patternKey: "ceo.architect-needs-examples",
      });
      expect(entry).toContain("## [LRN-");
      expect(entry).toContain("auth-system");
      expect(entry).toContain("ceo.architect-needs-examples");
      expect(entry).toContain("Status: pending");
    });
  });

  describe("buildObsidianNote", () => {
    it("formats an Obsidian decision note", () => {
      const note = MemoryWriter.buildObsidianNote({
        goal: "Build auth",
        decisions: [
          { iteration: 1, phase: "PLAN" as const, decision: "Start with schema", rationale: "Need clarity", timestamp: "2026-03-23T10:00:00Z" },
        ],
        outcome: "Completed successfully",
        projectName: "my-app",
      });
      expect(note).toContain("#pi-ceo");
      expect(note).toContain("Build auth");
      expect(note).toContain("Start with schema");
    });
  });
});
