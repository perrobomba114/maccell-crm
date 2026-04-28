export const PANTALLAS_DAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export type PantallasDay = (typeof PANTALLAS_DAYS)[number];

export type ScreenRow = {
  id: string;
  nombre: string;
  duracion: number;
  activo: boolean;
  lastseen: Date | null;
  clave: string | null;
  stamp: Date;
};

export type ContentRow = {
  id: string;
  screen_id: string;
  titulo: string;
  archivo: string;
  orden: number;
  peso: number;
  activo: boolean;
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
  stamp: Date;
};

export type ContentDayConfig = Record<PantallasDay, boolean>;

export const DEFAULT_DAY_CONFIG: ContentDayConfig = {
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: true,
  domingo: true,
};
