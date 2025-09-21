"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const throttler_2 = require("@nestjs/throttler");
const sanitize_middleware_1 = require("./common/middleware/sanitize.middleware");
const sanitize_response_interceptor_1 = require("./common/interceptors/sanitize-response.interceptor");
const security_exception_filter_1 = require("./common/filters/security-exception.filter");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const profile_module_1 = require("./profile/profile.module");
const health_module_1 = require("./health/health.module");
const audit_module_1 = require("./audit/audit.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(sanitize_middleware_1.SanitizeMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            database_module_1.DatabaseModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            profile_module_1.ProfileModule,
            health_module_1.HealthModule,
        ],
        controllers: [],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_2.ThrottlerGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: sanitize_response_interceptor_1.SanitizeResponseInterceptor,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: security_exception_filter_1.SecurityExceptionFilter,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map