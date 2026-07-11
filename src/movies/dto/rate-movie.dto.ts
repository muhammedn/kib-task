import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class RateMovieDto {
  @ApiProperty({ example: 9, minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  score: number;
}
