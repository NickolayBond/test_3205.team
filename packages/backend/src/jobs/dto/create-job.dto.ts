import { IsArray, IsUrl, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateJobDto {
  @IsArray({ message: 'Должен быть массив URL' })
  @ArrayMinSize(1, { message: 'Минимум 1 URL' })
  @IsUrl({}, { each: true, message: 'Каждый элемент должен быть валидным URL' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split('\n')
        .map((url: string) => url.trim())
        .filter(Boolean);
    }
    return value;
  })
  urls!: string[];
}
