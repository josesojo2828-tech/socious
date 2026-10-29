import { Module } from '@nestjs/common';
import { PriorityLeadsController } from './priority-leads.controller';
import { PriorityLeadsService } from './priority-leads.service';

@Module({
  controllers: [PriorityLeadsController],
  providers: [PriorityLeadsService]
})
export class PriorityLeadsModule { }
