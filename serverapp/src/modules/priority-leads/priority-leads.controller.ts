import { Controller, Post, Body } from "@nestjs/common";
import { PriorityLeadsService } from "./priority-leads.service";
import { CreatePriorityLeadDto } from "./dto/create-priority-lead.dto";
import { Public } from "src/shared/decorators/public.decorator";

@Public()
@Controller("api/priority-leads")
export class PriorityLeadsController {
    constructor(private readonly priorityLeadsService: PriorityLeadsService) { }

    @Post()
    async create(@Body() createPriorityLeadDto: CreatePriorityLeadDto) {
        return this.priorityLeadsService.create(createPriorityLeadDto);
    }
}
