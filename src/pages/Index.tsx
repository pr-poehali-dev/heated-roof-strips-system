import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface Segment {
  id: number;
  name: string;
  enabled: boolean;
  power: number;
  temperature: number;
  targetTemp: number;
  status: "normal" | "warning" | "critical" | "off";
  sensorId: string;
}

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  segment?: string;
}

interface Alert {
  id: number;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  acknowledged: boolean;
}

const INITIAL_SEGMENTS: Segment[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Сегмент ${i + 1}`,
  enabled: i < 8,
  power: 40 + Math.floor(Math.random() * 50),
  temperature: -5 + Math.floor(Math.random() * 15),
  targetTemp: 5,
  status: i < 8 ? (Math.random() > 0.8 ? "warning" : "normal") : "off",
  sensorId: `DS18B20-${String(i + 1).padStart(3, "0")}`,
}));

const generateChartData = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 3600000);
    return {
      time: `${time.getHours().toString().padStart(2, "0")}:00`,
      temp1: -8 + Math.random() * 12,
      temp2: -5 + Math.random() * 10,
      temp3: -3 + Math.random() * 8,
      power: 30 + Math.random() * 50,
      ambient: -10 + Math.random() * 5,
    };
  });
};

const generateLogs = (): LogEntry[] => {
  const types: LogEntry["type"][] = ["info", "warning", "error", "success"];
  const messages = [
    { type: "info" as const, msg: "Система запущена в штатном режиме" },
    { type: "success" as const, msg: "Сегмент 3 достиг целевой температуры" },
    { type: "warning" as const, msg: "Сегмент 7: температура приближается к порогу" },
    { type: "error" as const, msg: "Сегмент 11: датчик не отвечает" },
    { type: "info" as const, msg: "Автоматическая калибровка завершена" },
    { type: "warning" as const, msg: "Высокая нагрузка на линию питания L2" },
    { type: "success" as const, msg: "Обновление прошивки контроллера завершено" },
    { type: "info" as const, msg: "Переключение на ночной режим" },
    { type: "error" as const, msg: "Обрыв связи с датчиком DS18B20-005" },
    { type: "success" as const, msg: "Связь с датчиком DS18B20-005 восстановлена" },
    { type: "warning" as const, msg: "Потребление энергии превысило 80% лимита" },
    { type: "info" as const, msg: "Плановая проверка состояния нагревателей" },
  ];
  const now = new Date();
  return messages.map((m, i) => ({
    id: i + 1,
    timestamp: new Date(now.getTime() - i * 300000).toLocaleString("ru-RU"),
    type: m.type,
    message: m.msg,
    segment: m.msg.includes("Сегмент") ? m.msg.match(/Сегмент \d+/)?.[0] : undefined,
  }));
};

const generateAlerts = (): Alert[] => [
  { id: 1, timestamp: "13.02.2026 14:32", severity: "critical", message: "Перегрев сегмента 9 — температура 85°C", acknowledged: false },
  { id: 2, timestamp: "13.02.2026 13:15", severity: "high", message: "Датчик DS18B20-011 не отвечает более 10 минут", acknowledged: false },
  { id: 3, timestamp: "13.02.2026 12:40", severity: "medium", message: "Потребление линии L2 превысило 4.2 кВт", acknowledged: true },
  { id: 4, timestamp: "13.02.2026 11:00", severity: "low", message: "Плановое обслуживание через 48 часов", acknowledged: true },
  { id: 5, timestamp: "13.02.2026 09:20", severity: "high", message: "Короткое замыкание на сегменте 6 — автоотключение", acknowledged: true },
];

function getStatusColor(status: string) {
  switch (status) {
    case "normal": return "text-emerald-400";
    case "warning": return "text-amber-400";
    case "critical": return "text-red-400";
    default: return "text-zinc-500";
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case "normal": return "bg-emerald-400/10 border-emerald-400/30";
    case "warning": return "bg-amber-400/10 border-amber-400/30";
    case "critical": return "bg-red-400/10 border-red-400/30";
    default: return "bg-zinc-800/50 border-zinc-700/30";
  }
}

function getLogIcon(type: string) {
  switch (type) {
    case "info": return "Info";
    case "warning": return "AlertTriangle";
    case "error": return "XCircle";
    case "success": return "CheckCircle";
    default: return "Circle";
  }
}

function getLogColor(type: string) {
  switch (type) {
    case "info": return "text-sky-400";
    case "warning": return "text-amber-400";
    case "error": return "text-red-400";
    case "success": return "text-emerald-400";
    default: return "text-zinc-400";
  }
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case "critical": return { bg: "bg-red-500/15 border-red-500/40", text: "text-red-400", badge: "bg-red-500 text-white" };
    case "high": return { bg: "bg-orange-500/15 border-orange-500/40", text: "text-orange-400", badge: "bg-orange-500 text-white" };
    case "medium": return { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-400", badge: "bg-amber-500 text-black" };
    default: return { bg: "bg-sky-500/10 border-sky-500/30", text: "text-sky-400", badge: "bg-sky-500 text-white" };
  }
}

function getTempColor(temp: number) {
  if (temp <= -5) return "text-blue-400";
  if (temp <= 0) return "text-sky-300";
  if (temp <= 5) return "text-emerald-400";
  if (temp <= 10) return "text-amber-400";
  return "text-red-400";
}

function getHeatLevel(power: number) {
  if (power <= 15) return 1;
  if (power <= 30) return 2;
  if (power <= 45) return 3;
  if (power <= 60) return 4;
  if (power <= 75) return 5;
  if (power <= 90) return 6;
  return 7;
}

const STORAGE_KEY = "heater-tape-settings";

interface SavedSettings {
  segments: Segment[];
  alerts: Alert[];
  systemOn: boolean;
  tapeLength: string;
  tapeWidth: string;
  autoMode: boolean;
  thresholdTemp: string;
  alertSound: string;
  pollInterval: string;
}

function loadSettings(): Partial<SavedSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(data: Partial<SavedSettings>) {
  try {
    const existing = loadSettings() || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }));
  } catch (e) { /* ignore */ }
}

const Index = () => {
  const saved = loadSettings();

  const [segments, setSegments] = useState<Segment[]>(saved?.segments || INITIAL_SEGMENTS);
  const [chartData] = useState(generateChartData);
  const [logs] = useState(generateLogs);
  const [alerts, setAlerts] = useState(saved?.alerts || generateAlerts);
  const [systemOn, setSystemOn] = useState(saved?.systemOn ?? true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tapeLength, setTapeLength] = useState(saved?.tapeLength ?? "24");
  const [tapeWidth, setTapeWidth] = useState(saved?.tapeWidth ?? "50");
  const [autoMode, setAutoMode] = useState(saved?.autoMode ?? true);
  const [thresholdTemp, setThresholdTemp] = useState(saved?.thresholdTemp ?? "5");
  const [alertSound, setAlertSound] = useState(saved?.alertSound === "false" ? false : true);
  const [pollInterval, setPollInterval] = useState(saved?.pollInterval ?? "2");

  useEffect(() => {
    saveSettings({ segments: segments.map(s => ({ ...s })) });
  }, [segments]);

  useEffect(() => {
    saveSettings({ systemOn, tapeLength, tapeWidth, autoMode, thresholdTemp, alertSound: String(alertSound), pollInterval });
  }, [systemOn, tapeLength, tapeWidth, autoMode, thresholdTemp, alertSound, pollInterval]);

  useEffect(() => {
    saveSettings({ alerts });
  }, [alerts]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegments(prev =>
        prev.map(s => {
          if (!s.enabled) return s;
          const drift = (Math.random() - 0.5) * 1.5;
          const newTemp = Math.round((s.temperature + drift) * 10) / 10;
          return { ...s, temperature: newTemp };
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const toggleSegment = useCallback((id: number) => {
    setSegments(prev =>
      prev.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled, status: !s.enabled ? "normal" : "off" } : s
      )
    );
  }, []);

  const setPower = useCallback((id: number, power: number) => {
    setSegments(prev => prev.map(s => (s.id === id ? { ...s, power } : s)));
  }, []);

  const setTargetTemp = useCallback((id: number, targetTemp: number) => {
    setSegments(prev => prev.map(s => (s.id === id ? { ...s, targetTemp } : s)));
  }, []);

  const acknowledgeAlert = useCallback((id: number) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const activeSegments = segments.filter(s => s.enabled).length;
  const avgTemp = segments.filter(s => s.enabled).length > 0
    ? (segments.filter(s => s.enabled).reduce((acc, s) => acc + s.temperature, 0) / activeSegments).toFixed(1)
    : "—";
  const totalPower = segments.filter(s => s.enabled).reduce((acc, s) => acc + (s.power / 100) * 0.5, 0).toFixed(1);
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-background industrial-grid">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center glow-orange">
              <Icon name="Flame" size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-mono tracking-tight text-foreground">
                HEATER TAPE CONTROL
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Система управления обогревом скатов крыши v2.1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Icon name="Clock" size={14} />
                {currentTime.toLocaleTimeString("ru-RU")}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="Calendar" size={14} />
                {currentTime.toLocaleDateString("ru-RU")}
              </span>
            </div>

            {unacknowledgedAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse font-mono">
                <Icon name="Bell" size={12} className="mr-1" />
                {unacknowledgedAlerts}
              </Badge>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">СИС</span>
              <Switch checked={systemOn} onCheckedChange={setSystemOn} />
              <Badge variant={systemOn ? "default" : "secondary"} className={`font-mono text-xs ${systemOn ? "bg-emerald-600 text-white" : ""}`}>
                {systemOn ? "ВКЛ" : "ВЫКЛ"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4">
        <Tabs defaultValue="monitor" className="space-y-4">
          <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
            {[
              { value: "monitor", icon: "Monitor", label: "Монитор" },
              { value: "control", icon: "SlidersHorizontal", label: "Управление" },
              { value: "params", icon: "Settings2", label: "Параметры" },
              { value: "sensors", icon: "Thermometer", label: "Датчики" },
              { value: "charts", icon: "BarChart3", label: "Графики" },
              { value: "logs", icon: "FileText", label: "Логи" },
              { value: "settings", icon: "Settings", label: "Настройки" },
              { value: "alerts", icon: "AlertTriangle", label: "Алерты" },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 px-3 py-2"
              >
                <Icon name={tab.icon} size={14} />
                {tab.label}
                {tab.value === "alerts" && unacknowledgedAlerts > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unacknowledgedAlerts}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* МОНИТОР */}
          <TabsContent value="monitor" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-emerald-500/15 flex items-center justify-center">
                      <Icon name="Zap" size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">АКТИВНЫХ</span>
                  </div>
                  <p className="text-3xl font-bold font-mono text-emerald-400">{activeSegments}</p>
                  <p className="text-xs text-muted-foreground font-mono">из {segments.length} сегментов</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-sky-500/15 flex items-center justify-center">
                      <Icon name="Thermometer" size={16} className="text-sky-400" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">СР. ТЕМП</span>
                  </div>
                  <p className="text-3xl font-bold font-mono text-sky-400">{avgTemp}°</p>
                  <p className="text-xs text-muted-foreground font-mono">средняя по ленте</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-amber-500/15 flex items-center justify-center">
                      <Icon name="Gauge" size={16} className="text-amber-400" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">МОЩНОСТЬ</span>
                  </div>
                  <p className="text-3xl font-bold font-mono text-amber-400">{totalPower}</p>
                  <p className="text-xs text-muted-foreground font-mono">кВт потребление</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center">
                      <Icon name="Ruler" size={16} className="text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">ЛЕНТА</span>
                  </div>
                  <p className="text-3xl font-bold font-mono text-primary">{tapeLength}м</p>
                  <p className="text-xs text-muted-foreground font-mono">ширина {tapeWidth}мм</p>
                </CardContent>
              </Card>
            </div>

            {/* Визуализация ленты */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="LayoutGrid" size={16} className="text-primary" />
                  ВИЗУАЛИЗАЦИЯ ЛЕНТЫ — СКАТ КРЫШИ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {segments.map(seg => (
                      <div
                        key={seg.id}
                        className={`relative rounded-lg border p-3 transition-all cursor-pointer ${getStatusBg(seg.status)} ${seg.enabled ? "opacity-100" : "opacity-40"}`}
                        onClick={() => toggleSegment(seg.id)}
                      >
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">#{seg.id}</p>
                          {seg.enabled && (
                            <div
                              className="w-full h-2 rounded-full mb-1.5"
                              style={{
                                background: `hsl(${Math.max(0, 200 - seg.power * 2)} ${60 + seg.power * 0.3}% ${40 + seg.power * 0.15}%)`,
                              }}
                            />
                          )}
                          <p className={`text-sm font-bold font-mono ${seg.enabled ? getTempColor(seg.temperature) : "text-zinc-600"}`}>
                            {seg.enabled ? `${seg.temperature.toFixed(1)}°` : "—"}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {seg.enabled ? `${seg.power}%` : "выкл"}
                          </p>
                        </div>
                        <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${seg.status === "normal" ? "bg-emerald-400" : seg.status === "warning" ? "bg-amber-400 animate-pulse" : seg.status === "critical" ? "bg-red-400 animate-pulse" : "bg-zinc-600"}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Мини-график */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="TrendingUp" size={16} className="text-primary" />
                  ТЕМПЕРАТУРА ЗА 24 ЧАСА
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(25 95% 53%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(25 95% 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 18%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" />
                    <Tooltip
                      contentStyle={{ background: "hsl(220 18% 11%)", border: "1px solid hsl(220 16% 18%)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(210 20% 85%)" }}
                    />
                    <Area type="monotone" dataKey="temp1" stroke="hsl(25 95% 53%)" fill="url(#tempGrad)" name="Сегмент 1" />
                    <Area type="monotone" dataKey="ambient" stroke="hsl(200 80% 50%)" fill="none" strokeDasharray="4 4" name="Окр. среда" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* УПРАВЛЕНИЕ */}
          <TabsContent value="control" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Icon name="SlidersHorizontal" size={16} className="text-primary" />
                НЕЗАВИСИМОЕ УПРАВЛЕНИЕ СЕГМЕНТАМИ
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setSegments(prev => prev.map(s => ({ ...s, enabled: true, status: "normal" })))}>
                  <Icon name="Power" size={14} className="mr-1" /> Вкл. все
                </Button>
                <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setSegments(prev => prev.map(s => ({ ...s, enabled: false, status: "off" })))}>
                  <Icon name="PowerOff" size={14} className="mr-1" /> Выкл. все
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {segments.map(seg => (
                <Card key={seg.id} className={`bg-card border transition-all ${seg.enabled ? "border-border" : "border-border/30 opacity-60"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${seg.status === "normal" ? "bg-emerald-400" : seg.status === "warning" ? "bg-amber-400 animate-pulse" : seg.status === "critical" ? "bg-red-400 animate-pulse" : "bg-zinc-600"}`} />
                        <span className="font-mono font-bold text-sm">{seg.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                          {seg.sensorId}
                        </Badge>
                      </div>
                      <Switch checked={seg.enabled} onCheckedChange={() => toggleSegment(seg.id)} />
                    </div>

                    {seg.enabled && (
                      <>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 rounded bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground font-mono">ТЕМП</p>
                            <p className={`text-lg font-bold font-mono ${getTempColor(seg.temperature)}`}>
                              {seg.temperature.toFixed(1)}°
                            </p>
                          </div>
                          <div className="text-center p-2 rounded bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground font-mono">ЦЕЛЬ</p>
                            <p className="text-lg font-bold font-mono text-primary">
                              {seg.targetTemp}°
                            </p>
                          </div>
                          <div className="text-center p-2 rounded bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground font-mono">МОЩН</p>
                            <p className="text-lg font-bold font-mono text-amber-400">
                              {seg.power}%
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-mono text-muted-foreground">МОЩНОСТЬ НАГРЕВА</span>
                              <span className="text-[10px] font-mono text-primary">{seg.power}%</span>
                            </div>
                            <Slider
                              value={[seg.power]}
                              onValueChange={([v]) => setPower(seg.id, v)}
                              max={100}
                              step={5}
                              className="cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-mono text-muted-foreground">ЦЕЛЕВАЯ ТЕМПЕРАТУРА</span>
                              <span className="text-[10px] font-mono text-primary">{seg.targetTemp}°C</span>
                            </div>
                            <Slider
                              value={[seg.targetTemp]}
                              onValueChange={([v]) => setTargetTemp(seg.id, v)}
                              min={-10}
                              max={30}
                              step={1}
                              className="cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                              <span>ТЕПЛОВАЯ ШКАЛА</span>
                              <span>Уровень {getHeatLevel(seg.power)}/7</span>
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 7 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`h-2 flex-1 rounded-sm transition-all ${i < getHeatLevel(seg.power) ? `segment-heat-${i + 1}` : "bg-zinc-800"}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ПАРАМЕТРЫ */}
          <TabsContent value="params" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Ruler" size={16} className="text-primary" />
                    ПАРАМЕТРЫ ЛЕНТЫ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-mono text-muted-foreground">ДЛИНА (м)</Label>
                      <Input value={tapeLength} onChange={e => setTapeLength(e.target.value)} className="font-mono mt-1 bg-secondary border-border" />
                    </div>
                    <div>
                      <Label className="text-xs font-mono text-muted-foreground">ШИРИНА (мм)</Label>
                      <Input value={tapeWidth} onChange={e => setTapeWidth(e.target.value)} className="font-mono mt-1 bg-secondary border-border" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-muted-foreground">Тип нагревателя</span><span>Саморегулирующийся</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Макс. мощность</span><span>40 Вт/м</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Напряжение</span><span>220В ~50Гц</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Класс защиты</span><span>IP68</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Рабочий диапазон</span><span>-40°C ... +65°C</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Cable" size={16} className="text-primary" />
                    ЭЛЕКТРОПРОВОДКА
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-muted-foreground">Сечение провода</span><span>2.5 мм²</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Линия L1</span><span className="text-emerald-400">Норма — 3.2 кВт</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Линия L2</span><span className="text-amber-400">Нагрузка — 4.1 кВт</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Автомат</span><span>25A, тип C</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">УЗО</span><span>30мА, 40A</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Заземление</span><span className="text-emerald-400">Подключено</span></div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-2">НАГРУЗКА ЛИНИЙ</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span>L1</span><span className="text-emerald-400">64%</span>
                        </div>
                        <Progress value={64} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span>L2</span><span className="text-amber-400">82%</span>
                        </div>
                        <Progress value={82} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Cpu" size={16} className="text-primary" />
                    НАГРЕВАТЕЛЬНЫЕ ЭЛЕМЕНТЫ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {segments.map(seg => (
                      <div key={seg.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold">#{seg.id}</span>
                          <div className={`w-2 h-2 rounded-full ${seg.enabled ? "bg-emerald-400" : "bg-zinc-600"}`} />
                        </div>
                        <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                          <div className="flex justify-between"><span>Мощн.</span><span className="text-foreground">{seg.enabled ? `${(seg.power / 100 * 40).toFixed(0)} Вт/м` : "—"}</span></div>
                          <div className="flex justify-between"><span>Сопр.</span><span className="text-foreground">{seg.enabled ? `${(220 * 220 / (seg.power / 100 * 40 * 2)).toFixed(0)} Ом` : "—"}</span></div>
                          <div className="flex justify-between"><span>Ток</span><span className="text-foreground">{seg.enabled ? `${(seg.power / 100 * 40 * 2 / 220).toFixed(1)} A` : "—"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ДАТЧИКИ */}
          <TabsContent value="sensors" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="Thermometer" size={16} className="text-primary" />
                  ДАТЧИКИ ТЕМПЕРАТУРЫ DS18B20
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {segments.map(seg => (
                    <div key={seg.id} className={`p-4 rounded-lg border transition-all ${getStatusBg(seg.status)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon name="Thermometer" size={16} className={getStatusColor(seg.status)} />
                          <span className="font-mono text-sm font-bold">{seg.sensorId}</span>
                        </div>
                        <Badge variant="secondary" className={`font-mono text-[10px] ${getStatusColor(seg.status)}`}>
                          {seg.status === "normal" ? "НОРМА" : seg.status === "warning" ? "ВНИМАНИЕ" : seg.status === "critical" ? "КРИТИЧ" : "ОТКЛ"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-[10px] text-muted-foreground font-mono">ТЕКУЩАЯ</p>
                          <p className={`text-xl font-bold font-mono ${seg.enabled ? getTempColor(seg.temperature) : "text-zinc-600"}`}>
                            {seg.enabled ? `${seg.temperature.toFixed(1)}°` : "—"}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-[10px] text-muted-foreground font-mono">МИН 24ч</p>
                          <p className="text-xl font-bold font-mono text-blue-400">
                            {seg.enabled ? `${(seg.temperature - 3 - Math.random() * 2).toFixed(1)}°` : "—"}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-[10px] text-muted-foreground font-mono">МАКС 24ч</p>
                          <p className="text-xl font-bold font-mono text-red-400">
                            {seg.enabled ? `${(seg.temperature + 2 + Math.random() * 3).toFixed(1)}°` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-[11px] font-mono text-muted-foreground">
                        <div className="flex justify-between"><span>Привязка</span><span className="text-foreground">{seg.name}</span></div>
                        <div className="flex justify-between"><span>Точность</span><span className="text-foreground">±0.5°C</span></div>
                        <div className="flex justify-between"><span>Обновление</span><span className="text-foreground">каждые 2 сек</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ГРАФИКИ */}
          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="TrendingUp" size={16} className="text-primary" />
                    ТЕМПЕРАТУРА СЕГМЕНТОВ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 18%)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" unit="°C" />
                      <Tooltip contentStyle={{ background: "hsl(220 18% 11%)", border: "1px solid hsl(220 16% 18%)", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="temp1" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={false} name="Сегмент 1" />
                      <Line type="monotone" dataKey="temp2" stroke="hsl(142 72% 45%)" strokeWidth={2} dot={false} name="Сегмент 2" />
                      <Line type="monotone" dataKey="temp3" stroke="hsl(200 80% 50%)" strokeWidth={2} dot={false} name="Сегмент 3" />
                      <Line type="monotone" dataKey="ambient" stroke="hsl(215 15% 55%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Окр. среда" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Gauge" size={16} className="text-primary" />
                    ПОТРЕБЛЕНИЕ МОЩНОСТИ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 18%)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }} stroke="hsl(220 16% 18%)" unit="%" />
                      <Tooltip contentStyle={{ background: "hsl(220 18% 11%)", border: "1px solid hsl(220 16% 18%)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="power" stroke="hsl(38 92% 50%)" fill="url(#powerGrad)" strokeWidth={2} name="Мощность" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="BarChart3" size={16} className="text-primary" />
                  МОЩНОСТЬ ПО СЕГМЕНТАМ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-2 items-end h-40">
                  {segments.map(seg => (
                    <div key={seg.id} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{seg.enabled ? `${seg.power}%` : "—"}</span>
                      <div className="w-full bg-secondary rounded-t relative" style={{ height: `${seg.enabled ? seg.power : 5}%` }}>
                        <div
                          className="w-full h-full rounded-t transition-all"
                          style={{
                            background: seg.enabled
                              ? `hsl(${Math.max(0, 200 - seg.power * 2)} ${60 + seg.power * 0.3}% ${40 + seg.power * 0.15}%)`
                              : "hsl(220 14% 20%)",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">#{seg.id}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ЛОГИ */}
          <TabsContent value="logs">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="FileText" size={16} className="text-primary" />
                  ЖУРНАЛ СОБЫТИЙ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-2.5 rounded hover:bg-secondary/50 transition-colors">
                        <Icon name={getLogIcon(log.type)} size={16} className={`mt-0.5 shrink-0 ${getLogColor(log.type)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-muted-foreground">{log.timestamp}</span>
                            {log.segment && (
                              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">{log.segment}</Badge>
                            )}
                          </div>
                          <p className="text-sm font-mono mt-0.5">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* НАСТРОЙКИ */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Settings" size={16} className="text-primary" />
                    ОБЩИЕ НАСТРОЙКИ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono">Автоматический режим</p>
                      <p className="text-[11px] text-muted-foreground font-mono">Регулировка по датчикам</p>
                    </div>
                    <Switch checked={autoMode} onCheckedChange={setAutoMode} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono">Звуковые уведомления</p>
                      <p className="text-[11px] text-muted-foreground font-mono">Сигнал при алертах</p>
                    </div>
                    <Switch checked={alertSound} onCheckedChange={setAlertSound} />
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">ПОРОГ ВКЛЮЧЕНИЯ (°C)</Label>
                    <Input value={thresholdTemp} onChange={e => setThresholdTemp(e.target.value)} className="font-mono mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">ИНТЕРВАЛ ОПРОСА</Label>
                    <Select value={pollInterval} onValueChange={setPollInterval}>
                      <SelectTrigger className="font-mono mt-1 bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 секунда</SelectItem>
                        <SelectItem value="2">2 секунды</SelectItem>
                        <SelectItem value="5">5 секунд</SelectItem>
                        <SelectItem value="10">10 секунд</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Icon name="Shield" size={16} className="text-primary" />
                    ЗАЩИТА
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-muted-foreground">Макс. температура</span><span className="text-red-400">65°C</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Защита от перегрева</span><span className="text-emerald-400">Активна</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Защита от КЗ</span><span className="text-emerald-400">Активна</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Контроль утечки</span><span className="text-emerald-400">УЗО 30мА</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Автоотключение</span><span className="text-emerald-400">При обрыве датчика</span></div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-muted-foreground">Контроллер</span><span>ESP32-S3</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Прошивка</span><span>v2.1.4</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Связь</span><span className="text-emerald-400">WiFi / RS-485</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Аптайм</span><span>14д 7ч 23м</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* АЛЕРТЫ */}
          <TabsContent value="alerts">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-primary" />
                  АКТИВНЫЕ АЛЕРТЫ
                  {unacknowledgedAlerts > 0 && (
                    <Badge variant="destructive" className="font-mono text-xs ml-2">
                      {unacknowledgedAlerts} новых
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.map(alert => {
                    const style = getSeverityStyle(alert.severity);
                    return (
                      <div key={alert.id} className={`p-4 rounded-lg border transition-all ${style.bg} ${alert.acknowledged ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Icon
                              name={alert.severity === "critical" ? "AlertOctagon" : alert.severity === "high" ? "AlertTriangle" : "Info"}
                              size={18}
                              className={`mt-0.5 shrink-0 ${style.text}`}
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`font-mono text-[10px] ${style.badge}`}>
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <span className="text-[11px] font-mono text-muted-foreground">{alert.timestamp}</span>
                              </div>
                              <p className="text-sm font-mono">{alert.message}</p>
                            </div>
                          </div>
                          {!alert.acknowledged && (
                            <Button size="sm" variant="outline" className="font-mono text-xs shrink-0" onClick={() => acknowledgeAlert(alert.id)}>
                              <Icon name="Check" size={14} className="mr-1" />
                              Принять
                            </Button>
                          )}
                          {alert.acknowledged && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              <Icon name="CheckCheck" size={12} className="mr-1" />
                              Принято
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;