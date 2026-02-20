import { networkInterfaces } from "node:os";

import { execaSync } from "execa";

const TAILSCALE_COMMAND_CANDIDATES = [
  "tailscale",
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
];

const isValidOctets = (parts: number[]) => {
  return parts.every((value) => !Number.isNaN(value) && value >= 0 && value <= 255);
};

type IPv4Octets = [number, number, number, number];

const parseIPv4Octets = (address: string): IPv4Octets | null => {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || !isValidOctets(parts)) {
    return null;
  }
  return parts as IPv4Octets;
};

const isPrivateIP = (address: string) => {
  const octets = parseIPv4Octets(address);
  if (!octets) {
    return false;
  }
  const [first, second] = octets;
  if (first === 10) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  return first === 192 && second === 168;
};

export const isTailscaleIP = (address: string) => {
  const octets = parseIPv4Octets(address);
  if (!octets) {
    return false;
  }
  const [first, second] = octets;
  return first === 100 && second >= 64 && second <= 127;
};

const runTailscaleCommand = (bin: string, args: string[]) => {
  const result = execaSync(bin, args, {
    encoding: "utf8",
    timeout: 2000,
    stdio: ["pipe", "pipe", "ignore"],
    reject: false,
  });
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout;
};

const getTailscaleCommandOutput = (args: string[]) => {
  for (const bin of TAILSCALE_COMMAND_CANDIDATES) {
    try {
      const output = runTailscaleCommand(bin, args);
      if (!output) {
        continue;
      }
      return output;
    } catch {
      // ignore
    }
  }
  return null;
};

const getTailscaleFromCLI = () => {
  for (const bin of TAILSCALE_COMMAND_CANDIDATES) {
    try {
      const output = runTailscaleCommand(bin, ["ip", "-4"]);
      if (!output) {
        continue;
      }
      const ip = output
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .find((line) => line.length > 0 && isTailscaleIP(line));
      if (ip) {
        return ip;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

const getTailscaleFromInterfaces = () => {
  const interfaces = networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter((info): info is NonNullable<typeof info> => Boolean(info));
  const match = addresses.find((info) => info.family === "IPv4" && isTailscaleIP(info.address));
  return match?.address ?? null;
};

export const getTailscaleIP = () => {
  return getTailscaleFromCLI() ?? getTailscaleFromInterfaces();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null;

const normalizeDnsName = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\.$/u, "");
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^[A-Za-z0-9.-]+$/u.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const getTailscaleDnsName = () => {
  const output = getTailscaleCommandOutput(["status", "--json"]);
  if (!output) {
    return null;
  }
  try {
    const parsed = JSON.parse(output) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const self = parsed.Self;
    if (!isRecord(self)) {
      return null;
    }
    return normalizeDnsName(self.DNSName);
  } catch {
    return null;
  }
};

export const getLocalIP = () => {
  const interfaces = networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter((info): info is NonNullable<typeof info> => Boolean(info));
  const candidates = addresses.filter(
    (info) => info.family === "IPv4" && !info.internal && !isTailscaleIP(info.address),
  );
  const privateMatch = candidates.find((info) => isPrivateIP(info.address));
  if (privateMatch) {
    return privateMatch.address;
  }
  return candidates[0]?.address ?? "localhost";
};
