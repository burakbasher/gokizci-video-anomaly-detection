"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Device } from "@/app/lib/definitions";
import { VideoStream } from "./VideoStream";
import { Circle, Clipboard, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/contexts/AuthContext";

interface Props {
  device: Device;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

export const DeviceCard = ({ device, onStatusChange }: Props) => {
  const router = useRouter();
  const { user } = useAuth();

  if (user === undefined) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnomaly, setHasAnomaly] = useState(false);
  const [showSourceId, setShowSourceId] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSourceId, setCopiedSourceId] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | "error">(device.status);

  useEffect(() => {
    return () => {
      setIsExpanded(false);
    };
  }, []);

  const handleAnomalyDetected = (detected: boolean) => {
    setHasAnomaly(detected);
  };

  const handleStatusChange = (status: "online" | "offline" | "error") => {
    setDeviceStatus(status);
    if (onStatusChange) onStatusChange(status);
  };

  const handleConnect = () => {
    if (!device.stream_url || deviceStatus !== "online") return;
    router.push(`/m/${device.stream_url}`);
  };

  const handleCopy = () => {
    if (!device.stream_url) return;
    navigator.clipboard.writeText(`http://localhost:3000/m/${device.stream_url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleCopySourceId = () => {
    navigator.clipboard.writeText(device.source_id);
    setCopiedSourceId(true);
    setTimeout(() => setCopiedSourceId(false), 1000);
  };

  const isAdmin = user?.role === "admin";

  return (
    <div>
      <div className="flex flex-col bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md transition-all w-[320px]">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div className="group inline-flex items-center rounded-full px-2 py-1 transition hover:bg-background-alt cursor-pointer hover:shadow-sm">
              <button
                onClick={handleConnect}
                disabled={deviceStatus !== "online"}
                className="flex items-center gap-1 text-sm text-primary disabled:opacity-40 group-hover:text-primary-dark"
              >
                <Circle className="w-4 h-4 text-primary" />
                Bağlan
              </button>
            </div>



            <span
              className={`text-xs font-semibold px-3 py-1 rounded-xl tracking-wide ${deviceStatus === "online"
                ? "bg-green-100 text-green-700"
                : "bg-red-50 text-red-700"
                }`}
            >
              {deviceStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>

          <p className="text-primary text-lg font-semibold mt-2">{device.name}</p>

          <div className="-mx-4 mt-2 border-t border-background-alt"></div>


          <div className="mt-2">
            <p className="text-sm text-primary font-medium mb-1">Cihaz Yayın URL’i</p>
            <div className="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2 text-sm font-mono text-primary-light">
              <span className="truncate">localhost:3000/m/{device.stream_url}</span>
              <button
                onClick={handleCopy}
                className="ml-2 text-primary-light hover:text-primary"
                title="Kopyala"
              >
                <Clipboard className="w-4 h-4" />
              </button>
              {copied && (
                <span className="ml-2 text-green-600 text-xs">Kopyalandı!</span>
              )}
            </div>
          </div>


          <p className="text-primary-light text-sm mt-2">Cihaz türü {device.type}</p>

          {isAdmin && (
            <div className="border border-red-300 bg-red-50 text-red-800 rounded-md p-3 mt-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 font-semibold">
                  <Lock className="w-4 h-4" />
                  Gizli Bilgi
                </div>

                {/* Göz ikonu + tooltip */}
                <div className="relative group">
                  <button
                    onClick={() => setShowSourceId((prev) => !prev)}
                    className="text-red-600 hover:text-red-800 transition"
                  >
                    {showSourceId ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="absolute top-full right-0 mt-1 w-max px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {showSourceId ? "Gizle" : "Göster"}
                  </div>
                </div>
              </div>

              <p className="text-sm mb-2">
                Bu cihazın <span className="font-semibold">Source ID</span> değeri sadece admin kullanıcılar tarafından görüntülenebilir. Lütfen bu bilgiyi gizli tutunuz.
              </p>

              {showSourceId && (
                <div className="flex items-center bg-red-100 px-3 py-2 rounded text-sm justify-between">
                  <span className="break-all font-mono text-red-700 text-xs">{device.source_id}</span>
                  <button
                    onClick={handleCopySourceId}
                    className="ml-2 text-red-700 hover:text-red-900 transition"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                  {copiedSourceId && (
                    <span className="ml-2 text-green-700 text-xs">Kopyalandı!</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="-mx-4 mt-2 border-t border-background-alt"></div>

          <div className="group inline-flex items-center rounded-full mt-2 px-2 py-1 transition hover:bg-background cursor-pointer hover:shadow-sm">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary font-medium flex items-center gap-1 group-hover:text-primary-dark"
            >
              {isExpanded ? <span>◀</span> : <span>▶</span>}
              {isExpanded ? "Görüntüyü Gizle" : "Görüntüyü Göster"}
            </button>
          </div>

        </div>

        <div
          className="transition-[max-height] duration-500 ease-in-out overflow-hidden"
          style={{ maxHeight: isExpanded ? '250px' : '0px' }}
        >
          {isExpanded && (
            <div className="h-[200px] bg-black relative rounded-b-lg">
              <VideoStream
                sourceId={device.source_id}
                onAnomalyDetected={handleAnomalyDetected}
                onStatusChange={handleStatusChange}
                key={device.source_id}
              />
              {hasAnomaly && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full shadow">
                  Anomali!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
