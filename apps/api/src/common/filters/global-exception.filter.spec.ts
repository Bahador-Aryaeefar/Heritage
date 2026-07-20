import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { GlobalExceptionFilter } from './global-exception.filter';

interface CapturedResponse {
  host: ArgumentsHost;
  status(): number | undefined;
  body(): unknown;
}

function mockHost(): CapturedResponse {
  let statusCode: number | undefined;
  let jsonBody: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(body: unknown) {
      jsonBody = body;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, status: () => statusCode, body: () => jsonBody };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('maps a ZodError to a 400 with the failing issues', () => {
    const captured = mockHost();
    const schema = z.object({ slug: z.string(), lat: z.number() });
    let error: unknown;
    try {
      schema.parse({ slug: 123 });
    } catch (thrown) {
      error = thrown;
    }

    filter.catch(error, captured.host);

    expect(captured.status()).toBe(HttpStatus.BAD_REQUEST);
    const body = captured.body() as {
      statusCode: number;
      error: string;
      message: string;
      details: { path: string; message: string }[];
    };
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Validation failed',
    });
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'slug' }),
        expect.objectContaining({ path: 'lat' }),
      ]),
    );
  });

  it('passes an HttpException through with its own status and body', () => {
    const captured = mockHost();

    filter.catch(new BadRequestException('nope'), captured.host);

    expect(captured.status()).toBe(HttpStatus.BAD_REQUEST);
    expect(captured.body()).toMatchObject({ statusCode: 400, message: 'nope' });
  });

  it('maps an unknown error to a 500 without leaking internals', () => {
    const captured = mockHost();

    filter.catch(new Error('secret db string'), captured.host);

    expect(captured.status()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(captured.body()).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });
});
