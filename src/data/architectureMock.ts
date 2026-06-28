import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Box,
  Brain,
  Cloud,
  Database,
  Globe,
  HardDrive,
  Layers,
  Map,
  MessageSquare,
  Server,
  Workflow,
} from "lucide-react";

export type ArchitectureStageId = "stack" | "docker" | "load" | "k8s" | "production";

export type StackItem = {
  id: string;
  name: string;
  subtitle: string;
  category: "frontend" | "api" | "data" | "gis" | "infra" | "ai";
  icon: LucideIcon;
  accent: string;
  dockerImage: string;
};

export type K8sService = {
  id: string;
  name: string;
  color: string;
  basePods: number;
};

export type LoadTier = {
  users: number;
  label: string;
  status: "ok" | "warning" | "critical";
};

export type PodScaleTier = {
  pods: number;
  label: string;
  ms: number;
};

export const ARCHITECTURE_STAGES: { id: ArchitectureStageId; label: string; durationMs: number }[] = [
  { id: "stack", label: "Tech Stack", durationMs: 2800 },
  { id: "docker", label: "Docker", durationMs: 2400 },
  { id: "load", label: "Load", durationMs: 2600 },
  { id: "k8s", label: "Kubernetes", durationMs: 3200 },
  { id: "production", label: "Production", durationMs: 3000 },
];

export const TECH_STACK: StackItem[] = [
  {
    id: "react",
    name: "React + Vite",
    subtitle: "OpenLayers map workbench",
    category: "frontend",
    icon: Globe,
    accent: "#61dafb",
    dockerImage: "nilam/frontend:latest",
  },
  {
    id: "spring",
    name: "Spring Boot API",
    subtitle: "REST · JWT · GeoJSON services",
    category: "api",
    icon: Server,
    accent: "#6db33f",
    dockerImage: "nilam/geo-api:latest",
  },
  {
    id: "postgis",
    name: "PostgreSQL + PostGIS",
    subtitle: "Parcels · ULPIN · spatial indexes",
    category: "data",
    icon: Database,
    accent: "#336791",
    dockerImage: "postgis/postgis:16-3.4",
  },
  {
    id: "geoserver",
    name: "GeoServer",
    subtitle: "WMS · WFS · tile caching",
    category: "gis",
    icon: Map,
    accent: "#0ea5e9",
    dockerImage: "kartoza/geoserver:2.24",
  },
  {
    id: "redis",
    name: "Redis",
    subtitle: "Session & tile cache",
    category: "infra",
    icon: Activity,
    accent: "#dc382d",
    dockerImage: "redis:7-alpine",
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    subtitle: "GDAL · FMB · async jobs",
    category: "infra",
    icon: MessageSquare,
    accent: "#ff6600",
    dockerImage: "rabbitmq:3-management",
  },
  {
    id: "minio",
    name: "MinIO / S3",
    subtitle: "Raster · documents · exports",
    category: "infra",
    icon: HardDrive,
    accent: "#c72c48",
    dockerImage: "minio/minio:latest",
  },
  {
    id: "gdal",
    name: "GDAL Workers",
    subtitle: "Warp · reproject · extract",
    category: "gis",
    icon: Layers,
    accent: "#8b5cf6",
    dockerImage: "nilam/gdal-worker:latest",
  },
  {
    id: "nilai",
    name: "NIL-AI Service",
    subtitle: "Anomaly · OCR · parcel assist",
    category: "ai",
    icon: Brain,
    accent: "#a855f7",
    dockerImage: "nilam/nil-ai:latest",
  },
];

export const K8S_SERVICES: K8sService[] = [
  { id: "geo-api", name: "geo-api", color: "#6db33f", basePods: 4 },
  { id: "geoserver", name: "geoserver", color: "#0ea5e9", basePods: 3 },
  { id: "tile-cache", name: "tile-cache", color: "#dc382d", basePods: 6 },
  { id: "gdal-worker", name: "gdal-worker", color: "#8b5cf6", basePods: 8 },
  { id: "postgres-replica", name: "postgres-replica", color: "#336791", basePods: 2 },
];

export const LOAD_TIERS: LoadTier[] = [
  { users: 10, label: "Pilot", status: "ok" },
  { users: 100, label: "District rollout", status: "ok" },
  { users: 1_000, label: "State peak", status: "warning" },
  { users: 10_000, label: "Citizen surge", status: "critical" },
];

export const POD_SCALE_TIERS: PodScaleTier[] = [
  { pods: 1, label: "1 pod", ms: 0 },
  { pods: 100, label: "100 pods", ms: 48 },
  { pods: 1_000, label: "1,000 pods", ms: 12 },
];

export const PRODUCTION_LAYERS = [
  { id: "lb", label: "Load Balancer", icon: Cloud },
  { id: "ingress", label: "NGINX Ingress", icon: Workflow },
  { id: "pods", label: "Auto-scaled Pods", icon: Box },
  { id: "data", label: "PostGIS HA Cluster", icon: Database },
  { id: "obs", label: "Grafana + Prometheus", icon: Activity },
];
