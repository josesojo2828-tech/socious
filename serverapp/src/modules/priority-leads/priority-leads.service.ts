import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatePriorityLeadDto } from './dto/create-priority-lead.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PriorityLeadsService {
    private readonly logger = new Logger(PriorityLeadsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreatePriorityLeadDto) {
        try {
            const existingLead = await this.prisma.priorityLead.findUnique({
                where: { email: createDto.email },
            });

            if (existingLead) {
                throw new ConflictException('A user has already registered with this email.');
            }

            const hashedPassword = createDto.password
                ? await bcrypt.hash(createDto.password, 10)
                : null;

            const newLead = await this.prisma.priorityLead.create({
                data: {
                    firstName: createDto.firstName,
                    lastName: createDto.lastName,
                    email: createDto.email,
                    password: hashedPassword,
                    phone: createDto.phone,
                    city: createDto.city,
                    priceRange: createDto.priceRange,
                    featureRequest: createDto.featureRequest,
                    wantsNotifications: createDto.wantsNotifications ?? true,
                },
            });

            this.logger.log(`New priority lead created: ${newLead.email}`);
            return newLead;
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            this.logger.error('Error creating priority lead', error);
            throw error;
        }
    }
}
