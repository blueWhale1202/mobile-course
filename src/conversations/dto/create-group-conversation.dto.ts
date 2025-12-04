import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateGroupConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}
