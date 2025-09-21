"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let SanitizeResponseInterceptor = class SanitizeResponseInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)((data) => this.sanitizeResponse(data)));
    }
    sanitizeResponse(data) {
        if (!data) {
            return data;
        }
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
    removeSensitiveFields(obj, fields) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.removeSensitiveFields(item, fields));
        }
        const cleaned = { ...obj };
        for (const field of fields) {
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
        for (const key in cleaned) {
            if (cleaned.hasOwnProperty(key) && typeof cleaned[key] === 'object') {
                cleaned[key] = this.removeSensitiveFields(cleaned[key], fields);
            }
        }
        return cleaned;
    }
    toCamelCase(str) {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
};
exports.SanitizeResponseInterceptor = SanitizeResponseInterceptor;
exports.SanitizeResponseInterceptor = SanitizeResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], SanitizeResponseInterceptor);
//# sourceMappingURL=sanitize-response.interceptor.js.map