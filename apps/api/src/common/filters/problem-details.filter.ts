import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import type { ProblemDetails } from "@resonance/shared";

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const detail =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message;

    const problem: ProblemDetails = {
      type: `about:blank`,
      title: exception instanceof HttpException ? exception.name : "Internal Server Error",
      status,
      detail: Array.isArray(detail)
        ? detail.join(", ")
        : (detail ?? "An unexpected error occurred."),
      instance: request.url,
    };

    if (!(exception instanceof HttpException)) {
      console.error(exception);
    }

    response.status(status).contentType("application/problem+json").send(problem);
  }
}
