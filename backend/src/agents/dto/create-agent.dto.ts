import { IsString, IsOptional, MinLength, MaxLength, IsIn, IsNumber, Min, Max, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ minLength: 1, maxLength: 10000 })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  system_prompt: string;

  @ApiProperty({ enum: ['openai', 'anthropic', 'openrouter'] })
  @IsString()
  @IsIn(['openai', 'anthropic', 'openrouter'])
  provider: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  model: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 2, default: 0.7 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 100000, default: 2000 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100000)
  max_tokens?: number;
}
