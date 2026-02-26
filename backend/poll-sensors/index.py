import json
import os
import urllib.request
import urllib.error
from datetime import datetime


def handler(event: dict, context) -> dict:
    """
    Опрашивает датчики температуры, подключённые к контроллерам (Arduino/ESP32).
    Поддерживает два режима: IP (HTTP-запрос) и serial (заглушка, опрос по COM-порту
    возможен только локально на машине с контроллером).
    
    POST /poll-sensors
    Body: { "devices": [...ArduinoDevice], "sensors": [...{id, serialNumber, deviceId}] }
    Returns: { "results": [...{sensorId, temperature, status, lastUpdate}] }
    """
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    body = json.loads(event.get("body") or "{}")
    devices_raw = body.get("devices", [])
    sensors_raw = body.get("sensors", [])

    devices_map = {d["id"]: d for d in devices_raw}
    results = []

    for sensor in sensors_raw:
        sensor_id = sensor.get("id")
        serial = sensor.get("serialNumber") or sensor.get("serial", "")
        device_id = sensor.get("deviceId")
        device = devices_map.get(device_id)

        if not device or not device.get("enabled", True):
            results.append({
                "sensorId": sensor_id,
                "temperature": None,
                "status": "offline",
                "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                "error": "Устройство не найдено или отключено",
            })
            continue

        conn_type = device.get("connectionType", "ip")

        if conn_type == "ip":
            ip = device.get("ip", "")
            port = device.get("port", "80")
            url = f"http://{ip}:{port}/sensor/{serial}"
            try:
                req = urllib.request.Request(url, headers={"Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read().decode())
                    temp = data.get("temperature") or data.get("temp") or data.get("value")
                    results.append({
                        "sensorId": sensor_id,
                        "temperature": float(temp) if temp is not None else None,
                        "status": "online" if temp is not None else "error",
                        "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                        "rawResponse": data,
                    })
            except urllib.error.URLError as e:
                results.append({
                    "sensorId": sensor_id,
                    "temperature": None,
                    "status": "error",
                    "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                    "error": str(e.reason) if hasattr(e, "reason") else str(e),
                })
            except Exception as e:
                results.append({
                    "sensorId": sensor_id,
                    "temperature": None,
                    "status": "error",
                    "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                    "error": str(e),
                })

        elif conn_type == "serial":
            results.append({
                "sensorId": sensor_id,
                "temperature": None,
                "status": "offline",
                "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                "error": "COM-порт недоступен с облака. Используйте IP-подключение или локальный шлюз.",
            })

        else:
            results.append({
                "sensorId": sensor_id,
                "temperature": None,
                "status": "offline",
                "lastUpdate": datetime.now().strftime("%H:%M:%S"),
                "error": f"Неизвестный тип подключения: {conn_type}",
            })

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps({"results": results, "polledAt": datetime.now().strftime("%H:%M:%S")}),
    }
