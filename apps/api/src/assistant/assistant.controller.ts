import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { AssistantService } from "./assistant.service";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post("query")
  ask(
    @Body("question") question: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ answer: string }> {
    if (!question || !question.trim()) {
      throw new BadRequestException("question is required");
    }
    return this.assistant.ask(question.trim(), user);
  }
}
