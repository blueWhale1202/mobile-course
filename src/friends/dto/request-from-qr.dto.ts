import { IsString } from 'class-validator';

export class RequestFromQrDto {
  @IsString()
  token: string;
}
