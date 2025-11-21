import { Injectable } from '@nestjs/common';
import { DbClient } from '../db/client';
import { alerts } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Injectable()
export class AlertsService {
  private readonly resend: Resend;

  constructor(
    private readonly dbClient: DbClient,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async create(createAlertDto: CreateAlertDto) {
    const db = this.dbClient.db;
    const [alert] = await db
      .insert(alerts)
      .values({
        ...createAlertDto,
        startDate: createAlertDto.startDate
          ? new Date(createAlertDto.startDate)
          : undefined,
        endDate: createAlertDto.endDate
          ? new Date(createAlertDto.endDate)
          : undefined,
      })
      .returning();
    return alert;
  }

  async findAll(deviceId?: string) {
    const db = this.dbClient.db;
    if (deviceId) {
      return db.select().from(alerts).where(eq(alerts.deviceId, deviceId));
    }
    return db.select().from(alerts);
  }

  async findOne(id: number) {
    const db = this.dbClient.db;
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async update(id: number, updateAlertDto: UpdateAlertDto) {
    const db = this.dbClient.db;
    const [alert] = await db
      .update(alerts)
      .set({
        ...updateAlertDto,
        startDate:
          updateAlertDto.startDate &&
          typeof updateAlertDto.startDate === 'string'
            ? new Date(updateAlertDto.startDate)
            : undefined,
        endDate:
          updateAlertDto.endDate && typeof updateAlertDto.endDate === 'string'
            ? new Date(updateAlertDto.endDate)
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async remove(id: number) {
    const db = this.dbClient.db;
    const [alert] = await db
      .delete(alerts)
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async checkAlerts(deviceId: string, temperature: number, humidity?: number) {
    const db = this.dbClient.db;
    const deviceAlerts = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.deviceId, deviceId), eq(alerts.enabled, true)));

    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    for (const alert of deviceAlerts) {
      // 1. Check Date Range
      if (alert.startDate && now < alert.startDate) continue;
      if (alert.endDate && now > alert.endDate) continue;

      // 2. Check Days of the Week
      if (
        alert.daysOfWeek &&
        alert.daysOfWeek.length > 0 &&
        !alert.daysOfWeek.includes(currentDay)
      ) {
        continue;
      }

      // 3. Check Time Range
      if (alert.startTime && alert.endTime) {
        if (alert.startTime <= alert.endTime) {
          // e.g. 09:00 to 17:00
          if (
            currentTimeStr < alert.startTime ||
            currentTimeStr > alert.endTime
          )
            continue;
        } else {
          // e.g. 22:00 to 06:00 (overnight)
          if (
            currentTimeStr < alert.startTime &&
            currentTimeStr > alert.endTime
          )
            continue;
        }
      }

      // 4. Check Thresholds
      let triggered = false;
      let value = 0;
      if (alert.type === 'temperature') {
        value = temperature;
        if (
          (alert.minThreshold !== null && temperature < alert.minThreshold) ||
          (alert.maxThreshold !== null && temperature > alert.maxThreshold)
        ) {
          triggered = true;
        }
      } else if (alert.type === 'humidity' && humidity !== undefined) {
        value = humidity;
        if (
          (alert.minThreshold !== null && humidity < alert.minThreshold) ||
          (alert.maxThreshold !== null && humidity > alert.maxThreshold)
        ) {
          triggered = true;
        }
      }

      if (triggered) {
        // 5. Check Throttling (e.g., 1 hour cooldown)
        const lastTriggered = alert.lastTriggeredAt;
        if (
          lastTriggered &&
          now.getTime() - lastTriggered.getTime() < 60 * 60 * 1000
        ) {
          continue;
        }

        // 6. Send Email
        await this.sendAlertEmail(alert, value);

        // 7. Update lastTriggeredAt
        await db
          .update(alerts)
          .set({ lastTriggeredAt: now })
          .where(eq(alerts.id, alert.id));
      }
    }
  }

  private async sendAlertEmail(
    alert: typeof alerts.$inferSelect,
    value: number,
  ) {
    try {
      await this.resend.emails.send({
        from: 'HeatSync Alerts <onboarding@resend.dev>', // Default Resend sender
        to: alert.emails,
        subject: `Alert Triggered: ${alert.type} on Device ${alert.deviceId}`,
        html: `
          <h1>Alert Triggered</h1>
          <p><strong>Device:</strong> ${alert.deviceId}</p>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Current Value:</strong> ${value}</p>
          <p><strong>Thresholds:</strong> Min: ${alert.minThreshold ?? 'N/A'}, Max: ${alert.maxThreshold ?? 'N/A'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
      });
      console.log(`Alert email sent to ${alert.emails.join(', ')}`);
    } catch (error) {
      console.error('Failed to send alert email:', error);
    }
  }
}
