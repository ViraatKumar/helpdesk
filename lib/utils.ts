import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Initials for avatar circles from a contact label that may be a name ("Jane Doe" → "JD") or an
// email ("jane.doe@x.com" → "JA"). Local-part only for emails so the domain never leaks in.
export function initialsFor(label: string): string {
  const cleaned = label.split("@")[0]?.trim() || label.trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getURL(): string {
  let url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "https://helpdesk-lhtmnyydz-viraatprojects.vercel.app";

  url = url.includes("http") ? url : `https://${url}`;
  // Remove trailing slash if present to make appending paths easier
  url = url.endsWith("/") ? url.slice(0, -1) : url;
  
  // If we are in local development and not explicitly setting an APP URL, use localhost
  if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_APP_URL) {
    url = "http://localhost:3000";
  }

  return url;
}
