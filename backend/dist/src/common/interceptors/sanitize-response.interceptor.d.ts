import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class SanitizeResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private sanitizeResponse;
    private removeSensitiveFields;
    private toCamelCase;
    private toSnakeCase;
}
