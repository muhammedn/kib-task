import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../interfaces/auth.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
