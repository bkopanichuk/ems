import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DateSerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data: any) => this.transformDates(data)));
  }

  private transformDates(obj: any): any {
    // Handle null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformDates(item));
    }

    // Handle Plain Objects (not class instances)
    if (obj.constructor === Object) {
      const transformed: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          transformed[key] = this.transformDates(obj[key]);
        }
      }
      return transformed;
    }

    // Return primitives and other types as-is
    return obj;
  }
}
