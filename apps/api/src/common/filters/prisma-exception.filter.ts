import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Safety net for Prisma errors that escaped a service without going through
// handlePrismaError(resource). Services should still call the helper so the
// message can name the resource; this filter only guarantees the status code.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      {
        P2025: HttpStatus.NOT_FOUND,
        P2003: HttpStatus.BAD_REQUEST,
        P2002: HttpStatus.CONFLICT,
      }[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : `Database constraint error (${exception.code})`,
    });
  }
}
