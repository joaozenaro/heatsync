import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttService } from './mqtt.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: MqttService,
          useValue: {
            getLatestTemperature: () => '25.5',
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    app.get<MqttService>(MqttService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
