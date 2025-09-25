import { Module } from '@nestjs/common';
import { InvertersController } from './inverters.controller';
import { InvertersService } from './inverters.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InvertersController],
  providers: [InvertersService],
  exports: [InvertersService],
})
export class InvertersModule {}
