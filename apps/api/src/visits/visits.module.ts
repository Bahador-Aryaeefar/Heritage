import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitEventsService } from './application/visit-events.service';
import { AdminVisitsController, PublicVisitsController } from './presentation/visits.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [PublicVisitsController, AdminVisitsController],
  providers: [VisitEventsService],
  exports: [VisitEventsService],
})
export class VisitsModule {}
