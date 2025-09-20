# ESP32

[Arduino ESP32](https://github.com/espressif/arduino-esp32)

## Pré-requisitos

- Docker
- Visual Studio Code, com a extensão para desenvolvimento com contêineres

### Requisitos para WSL

```console
usbipd list
usbipd bind --busid <port_id>
usbipd attach --wsl --busid <port_id>
```

### Compilação e Upload

Para compilar e enviar seu código para o ESP32, você pode usar os comandos do PlatformIO disponíveis na interface do VS Code ou usar o terminal:

```bash
pio run --target upload
```

Se o upload falhar, verifique as permissões

```bash
sudo chmod 777 /dev/ttyUSB0
```

### Monitoramento da Saída Serial

Para monitorar a saída serial do ESP32, use o seguinte comando:

```bash
pio serial monitor
```

### Abrir firewall

```powershell

netsh interface portproxy reset

netsh interface portproxy add v4tov4 listenaddress=192.168.137.1 listenport=1884 connectaddress=172.27.30.109 connectport=1884

netsh interface portproxy delete v4tov4 listenaddress=192.168.137.1 listenport=1884

```
