import { DateSerializationInterceptor } from './date-serialization.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('DateSerializationInterceptor', () => {
  let interceptor: DateSerializationInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new DateSerializationInterceptor();
    mockExecutionContext = {} as ExecutionContext;
    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should convert Date objects to ISO strings', (done) => {
    const testDate = new Date('2025-01-01T12:00:00.000Z');
    const mockData = {
      id: 1,
      createdAt: testDate,
      updatedAt: testDate,
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.createdAt).toBe('2025-01-01T12:00:00.000Z');
        expect(result.updatedAt).toBe('2025-01-01T12:00:00.000Z');
        expect(result.id).toBe(1);
        done();
      },
    });
  });

  it('should handle nested objects with dates', (done) => {
    const testDate = new Date('2025-01-01T12:00:00.000Z');
    const mockData = {
      user: {
        id: 1,
        profile: {
          createdAt: testDate,
          lastLoginAt: testDate,
        },
      },
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.user.profile.createdAt).toBe('2025-01-01T12:00:00.000Z');
        expect(result.user.profile.lastLoginAt).toBe('2025-01-01T12:00:00.000Z');
        done();
      },
    });
  });

  it('should handle arrays with dates', (done) => {
    const testDate1 = new Date('2025-01-01T12:00:00.000Z');
    const testDate2 = new Date('2025-01-02T12:00:00.000Z');
    const mockData = [
      { id: 1, createdAt: testDate1 },
      { id: 2, createdAt: testDate2 },
    ];

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result[0].createdAt).toBe('2025-01-01T12:00:00.000Z');
        expect(result[1].createdAt).toBe('2025-01-02T12:00:00.000Z');
        done();
      },
    });
  });

  it('should handle deeply nested arrays and objects', (done) => {
    const testDate = new Date('2025-01-01T12:00:00.000Z');
    const mockData = {
      users: [
        {
          id: 1,
          posts: [
            {
              id: 1,
              publishedAt: testDate,
              comments: [
                {
                  id: 1,
                  createdAt: testDate,
                },
              ],
            },
          ],
        },
      ],
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.users[0].posts[0].publishedAt).toBe('2025-01-01T12:00:00.000Z');
        expect(result.users[0].posts[0].comments[0].createdAt).toBe('2025-01-01T12:00:00.000Z');
        done();
      },
    });
  });

  it('should handle null and undefined values', (done) => {
    const mockData = {
      id: 1,
      createdAt: null,
      updatedAt: undefined,
      deletedAt: null,
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.createdAt).toBeNull();
        expect(result.updatedAt).toBeUndefined();
        expect(result.deletedAt).toBeNull();
        done();
      },
    });
  });

  it('should preserve non-date values', (done) => {
    const mockData = {
      id: 1,
      name: 'Test',
      isActive: true,
      count: 42,
      metadata: { key: 'value' },
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual(mockData);
        done();
      },
    });
  });

  it('should handle empty objects and arrays', (done) => {
    const mockData = {
      emptyObject: {},
      emptyArray: [],
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.emptyObject).toEqual({});
        expect(result.emptyArray).toEqual([]);
        done();
      },
    });
  });

  it('should not modify non-plain objects', (done) => {
    class CustomClass {
      constructor(public value: string) {}
    }

    const customInstance = new CustomClass('test');
    const mockData = {
      custom: customInstance,
      plainObject: { value: 'test' },
    };

    mockCallHandler.handle = jest.fn(() => of(mockData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.custom).toBe(customInstance);
        expect(result.plainObject).toEqual({ value: 'test' });
        done();
      },
    });
  });
});