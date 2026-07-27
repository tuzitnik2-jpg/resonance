import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const pipe = new ZodValidationPipe(schema);

  it("returns the parsed value when input is valid", () => {
    const input = { email: "user@example.com", password: "secret" };
    expect(pipe.transform(input)).toEqual(input);
  });

  it("throws BadRequestException when input is invalid", () => {
    expect(() => pipe.transform({ email: "not-an-email", password: "" })).toThrow(
      BadRequestException,
    );
  });
});
