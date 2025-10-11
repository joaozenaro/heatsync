# HeatSync

Este projeto é uma aplicação de dashboard IoT full-stack para monitorar umidade e temperatura em tempo real.

## Funcionalidades

- [ ] Dashboard em tempo real com Socket.IO
- [ ] Filtragem por hierarquia de dispositivos: $Edifício \rightarrow Setor \rightarrow Andar \rightarrow Sala \rightarrow Dispositivo$
- [ ] Sistema de alerta para limites de temperatura/umidade
- [ ] Exportação de dados para intervalos de datas selecionados
- [ ] Autenticação via Supabase Auth

## Tech Stack

| Categoria              | Tecnologia                                                     |
| ---------------------- | -------------------------------------------------------------- |
| Frontend               | [Next.js](https://nextjs.org/docs)                             |
|                        | [React.js](https://react.dev/)                                 |
|                        | [shadcn/ui](https://ui.shadcn.com/)                            |
| Backend                | [NestJS](https://docs.nestjs.com/)                             |
|                        | [Socket.io](https://socket.io/)                                |
|                        | [Drizzle ORM](https://orm.drizzle.team/docs/get-started)       |
| Dispositivo / Firmware | ESP32 com [PlatformIO](https://docs.platformio.org/en/latest/) |
| Banco de Dados         | [PostgreSQL](https://www.postgresql.org/)                      |
| MQTT                   | [Mosquitto MQTT](https://mosquitto.org/)                       |
| Serviço de SMTP        | [Resend](https://resend.com/home)                              |
| CI/CD                  | [GitHub Actions](https://docs.github.com/en/actions)           |
| Autenticação           | [Supabase Auth](https://supabase.com/docs/guides/auth)         |
| Hospedagem             | [Render](https://render.com/docs)                              |
|                        | [Vercel](https://vercel.com/docs)                              |
|                        | [Supabase](https://supabase.com/docs)                          |
|                        | [HiveMQ](https://docs.hivemq.com/hivemq-cloud/)                |

## Pontos de Atenção e Pesquisa

1. Operação da ESP32 em Baixas Temperaturas
   - Verificação dos limites de temperatura durante a operação.
   - Testes de desempenho em condições reais para validar a estabilidade.
   - Impacto na confiabilidade do Wi-Fi/MQTT em temperaturas extremas.
2. Firewall da Empresa / Bloqueio de Rede pelo Freezer
   - Análise de redes isoladas e proxies em ambientes corporativos.
   - Avaliação de alternativas de fallback (modem 4G/5G USB, LoRaWAN) para garantir conectividade.
3. Necessidade de Redundância
   - Viabilidade de um armazenamento temporário local e sincronização.
4. Legislação e Certificações
   - Homologação de módulos de comunicação (Wi-Fi, LoRa, etc.) junto à ANATEL.
   - Requisitos específicos de órgãos como o INEP para institutos de pesquisa e laboratórios.
5. Desenvolvimento de Placa Personalizada
   - Avaliação de parceiros como PCBWay para produção otimizada em custo.
   - Análise comparativa de componentes: RTD vs. termistores, e sensores digitais (DS18B20, SHT3x) para determinar a melhor precisão e custo.
