import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

function getParamDecoratorFactory(decorator: ParameterDecorator) {
  class TestHost {
    test(@decorator() _value: unknown) {}
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestHost,
    'test',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;

  return Object.values(args)[0].factory;
}

describe('CurrentUser decorator', () => {
  it('extracts user from request', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = { userId: 1, userKey: 'key', email: 'a@b.com' };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, context)).toBe(user);
  });
});
