import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ROLE_LABEL_MAP: Record<string, string> = {
  FPDS: "Flex DPS",
  HS: "Hitscan",
  FS: "Flex Support",
  MS: "Main Support",
}

export function formatRoleLabel(role: string) {
  return ROLE_LABEL_MAP[role] || role
}

export function formatRoleList(roles: string[]) {
  return roles.map((role) => formatRoleLabel(role)).join(", ")
}
