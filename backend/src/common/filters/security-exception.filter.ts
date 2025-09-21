import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Error';
      } else {
        message = exceptionResponse.toString();
      }

      // Log security-related errors
      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN
      ) {
        this.logger.warn({
          message: 'Security exception',
          path: request.url,
          method: request.method,
          status,
          user: (request as any).user?.id,
          ip: request.ip,
          userAgent: request.get('user-agent'),
        });
      }
    } else {
      // Log unexpected errors but don't expose details
      this.logger.error({
        message: 'Unexpected error',
        error: exception,
        path: request.url,
        method: request.method,
        user: (request as any).user?.id,
        ip: request.ip,
      });
    }

    // Sanitize error messages to prevent information leakage
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'An error occurred while processing your request';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
