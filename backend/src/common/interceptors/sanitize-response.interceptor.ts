import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.sanitizeResponse(data)),
    );
  }

  private sanitizeResponse(data: any): any {
    if (!data) {
      return data;
    }

    // Remove sensitive fields from response
    // Note: refresh_token and access_token are intentionally NOT included
    // as they need to be returned in auth responses
    const sensitiveFields = [
      'password',
      'secret',
      'apiKey',
      'api_key',
      'privateKey',
      'private_key',
    ];

    return this.removeSensitiveFields(data, sensitiveFields);
  }

  private removeSensitiveFields(obj: any, fields: string[]): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveFields(item, fields));
    }

    const cleaned = { ...obj };

    for (const field of fields) {
      // Check for field in different cases
      const variations = [
        field,
        field.toLowerCase(),
        field.toUpperCase(),
        this.toCamelCase(field),
        this.toSnakeCase(field),
      ];

      for (const variation of variations) {
        if (variation in cleaned) {
          delete cleaned[variation];
        }
      }
    }

    // Recursively clean nested objects
    for (const key in cleaned) {
      if (cleaned.hasOwnProperty(key) && typeof cleaned[key] === 'object') {
        cleaned[key] = this.removeSensitiveFields(cleaned[key], fields);
      }
    }

    return cleaned;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}