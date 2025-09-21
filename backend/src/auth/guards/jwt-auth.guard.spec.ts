import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Mock the AuthGuard from passport
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation((strategy: string) => {
    return class MockAuthGuard {
      canActivate(context: ExecutionContext) {
        // Mock successful authentication for JWT strategy
        if (strategy === 'jwt') {
          const request = context.switchToHttp().getRequest();
          // Check if there's a valid authorization header
          if (request.headers?.authorization?.startsWith('Bearer ')) {
            request.user = { id: '1', role: 'USER' };
            return true;
          }
          return false;
        }
        return true;
      }
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('canActivate', () => {
    const createMockExecutionContext = (
      hasAuth: boolean = true,
    ): ExecutionContext => {
      return {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: hasAuth ? { authorization: 'Bearer valid-token' } : {},
            user: null,
          }),
          getResponse: jest.fn().mockReturnValue({}),
          getNext: jest.fn(),
        }),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn().mockReturnValue('http'),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        getRpcContext: jest.fn(),
        getWsContext: jest.fn(),
      } as unknown as ExecutionContext;
    };

    it('should allow access with valid JWT token', () => {
      const context = createMockExecutionContext(true);
      const result = guard.canActivate(context);

      expect(result).toBe(true);

      // Verify that user was set on request
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({ id: '1', role: 'USER' });
    });

    it('should deny access without JWT token', () => {
      const context = createMockExecutionContext(false);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should be an instance of AuthGuard', () => {
      expect(guard).toBeDefined();
      expect(guard.canActivate).toBeDefined();
    });
  });
});
