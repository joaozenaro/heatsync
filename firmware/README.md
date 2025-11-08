# ESP32 WSL Dev Setup

[Arduino ESP32](https://github.com/espressif/arduino-esp32)

### Share locally connected USB device to WSL

```console
usbipd list
usbipd bind --busid <port_id>
usbipd attach --wsl --busid <port_id>
```

### Update firewall permissions

```console
netsh interface portproxy reset
```

```console
netsh interface portproxy add v4tov4 listenaddress=192.168.137.1 listenport=1884 connectaddress=172.27.30.109 connectport=1884
```

```console
netsh interface portproxy delete v4tov4 listenaddress=192.168.137.1 listenport=1884
```

### Update serial permissions

```console
sudo chmod 777 /dev/ttyUSB0
```

### Compile and upload

```console
pio run
```

```console
pio run -t upload -e dev
```
