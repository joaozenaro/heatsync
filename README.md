# HeatSync

This project is a full-stack IoT dashboard application designed to monitor humidity and temperature in real time.

## Features

- [x] Real-time dashboard with Socket.IO
- [ ] Hierarchical device filtering: $Building \rightarrow Sector \rightarrow Floor \rightarrow Room \rightarrow Device$
- [ ] Alert system for temperature/humidity threshold violations
- [ ] Data export for selected date ranges
- [x] Authentication via Supabase Auth

## Tech Stack

| Category          | Technology                                                      |
| ----------------- | --------------------------------------------------------------- |
| Frontend          | [Next.js](https://nextjs.org/docs)                              |
|                   | [React.js](https://react.dev/)                                  |
|                   | [shadcn/ui](https://ui.shadcn.com/)                             |
| Backend           | [NestJS](https://docs.nestjs.com/)                              |
|                   | [Socket.io](https://socket.io/)                                 |
|                   | [Drizzle ORM](https://orm.drizzle.team/docs/get-started)        |
| Device / Firmware | ESP32 with [PlatformIO](https://docs.platformio.org/en/latest/) |
| Database          | [PostgreSQL](https://www.postgresql.org/)                       |
| MQTT              | [Mosquitto MQTT](https://mosquitto.org/)                        |
| SMTP Service      | [Resend](https://resend.com/home)                               |
| CI/CD             | [GitHub Actions](https://docs.github.com/en/actions)            |
| Authentication    | [Supabase Auth](https://supabase.com/docs/guides/auth)          |
| Hosting           | [Render](https://render.com/docs)                               |
|                   | [Vercel](https://vercel.com/docs)                               |
|                   | [Supabase](https://supabase.com/docs)                           |
|                   | [HiveMQ](https://docs.hivemq.com/hivemq-cloud/)                 |

## Key Considerations & Research Topics

1. **ESP32 Operation in Low Temperatures**

   - Validate operational temperature limits.
   - Conduct performance testing under real-world conditions to ensure stability.
   - Assess Wi-Fi/MQTT reliability under extreme temperatures.

2. **Corporate Firewalls / Network Interference from Freezers**

   - Analyze isolated networks and proxy configurations in corporate environments.
   - Evaluate fallback connectivity options (e.g., USB 4G/5G modem, LoRaWAN) to ensure uptime.

3. **Redundancy Requirements**

   - Investigate feasibility of local temporary storage and synchronization mechanisms.

4. **Regulations and Certifications**

   - Certification of communication modules (Wi-Fi, LoRa, etc.) with ANATEL.
   - Compliance with specific requirements from agencies such as INEP for research institutes and laboratories.

5. **Custom PCB Development**

   - Explore partnerships with manufacturers such as PCBWay for cost-optimized production.
   - Compare sensor technologies (RTD vs. thermistors, and digital sensors like DS18B20 or SHT3x) to balance accuracy and cost.
