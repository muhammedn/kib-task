import { Test, TestingModule } from '@nestjs/testing';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';

describe('GenresController', () => {
  let controller: GenresController;
  let genresService: { findAll: jest.Mock };

  beforeEach(async () => {
    genresService = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [{ provide: GenresService, useValue: genresService }],
    }).compile();

    controller = module.get(GenresController);
  });

  it('find all genres successfully', () => {
    const genres = [{ id: 1, name: 'Action' }];
    genresService.findAll.mockReturnValue(genres);

    expect(controller.findAll()).toBe(genres);
    expect(genresService.findAll).toHaveBeenCalled();
  });
});
