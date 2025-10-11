import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttService } from './mqtt.service';
import { ConfigModule } from '@nestjs/config';
import { TemperatureModule } from './temperature/temperature.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),
    TemperatureModule,
  ],
  controllers: [AppController],
  providers: [AppService, MqttService],
})
export class AppModule {}
