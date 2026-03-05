import { IsString, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  agentId: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  messages?: any[];
}
