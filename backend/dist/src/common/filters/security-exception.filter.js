"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let SecurityExceptionFilter = SecurityExceptionFilter_1 = class SecurityExceptionFilter {
    logger = new common_1.Logger(SecurityExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                message = exceptionResponse.message || exception.message;
                error = exceptionResponse.error || 'Error';
            }
            else {
                message = exceptionResponse.toString();
            }
            if (status === common_1.HttpStatus.UNAUTHORIZED || status === common_1.HttpStatus.FORBIDDEN) {
                this.logger.warn({
                    message: 'Security exception',
                    path: request.url,
                    method: request.method,
                    status,
                    user: request.user?.id,
                    ip: request.ip,
                    userAgent: request.get('user-agent'),
                });
            }
        }
        else {
            this.logger.error({
                message: 'Unexpected error',
                error: exception,
                path: request.url,
                method: request.method,
                user: request.user?.id,
                ip: request.ip,
            });
        }
        if (status === common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
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
};
exports.SecurityExceptionFilter = SecurityExceptionFilter;
exports.SecurityExceptionFilter = SecurityExceptionFilter = SecurityExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], SecurityExceptionFilter);
//# sourceMappingURL=security-exception.filter.js.map