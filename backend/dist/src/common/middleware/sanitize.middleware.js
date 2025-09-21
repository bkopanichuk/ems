"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeMiddleware = void 0;
const common_1 = require("@nestjs/common");
let SanitizeMiddleware = class SanitizeMiddleware {
    use(req, res, next) {
        if (req.body && typeof req.body === 'object') {
            req.body = this.sanitizeObject(req.body);
        }
        next();
    }
    sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        if (obj !== null && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const sanitizedKey = this.sanitizeString(key);
                    sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    }
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return str;
        }
        str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        str = str.trim();
        str = str.replace(/\0/g, '');
        return str;
    }
};
exports.SanitizeMiddleware = SanitizeMiddleware;
exports.SanitizeMiddleware = SanitizeMiddleware = __decorate([
    (0, common_1.Injectable)()
], SanitizeMiddleware);
//# sourceMappingURL=sanitize.middleware.js.map