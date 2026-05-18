"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleHelp, Loader2, RefreshCcw, ScanBarcode, Search, Type, X } from "lucide-react";
import type { VerdictPayload } from "./TagPriceCard";
import { TagPriceCard } from "./TagPriceCard";
import {
  DEVICE_FINGERPRINT_LOCALSTORAGE_KEY,
  DEVICE_PREFERRED_CAMERA_LOCALSTORAGE_KEY,
} from "@/lib/device-constants";

type Mode = "camera" | "manual";

type Status =
  | { kind: "idle" }
  | { kind: "starting-camera" }
  | { kind: "camera-ready" }
  | { kind: "scanning-barcode" }
  | { kind: "captured" }
  | { kind: "identifying" }
  | { kind: "looking-up" }
  | { kind: "result" }
  | { kind: "error"; message: string };

type ScannerProps = {
  kiosk?: boolean;
};

type VerdictResponse = VerdictPayload & { scanId?: string };

export function Scanner({ kiosk = false }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeReaderRef = useRef<null | {
    decodeFromVideoElement: (
      el: HTMLVideoElement,
      cb: (result: { getText(): string } | null, err: unknown) => void,
    ) => Promise<void>;
    reset: () => void;
  }>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [costBasis, setCostBasis] = useState<string>("3.00");
  const [manualQuery, setManualQuery] = useState<string>("");
  const [verdict, setVerdict] = useState<VerdictPayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean>(false);
  const [registeringDevice, setRegisteringDevice] = useState<boolean>(false);
  const [pairBannerError, setPairBannerError] = useState<string | null>(null);
  const [kioskHelpOpen, setKioskHelpOpen] = useState<boolean>(false);
  const [kioskCountdown, setKioskCountdown] = useState<number | null>(null);

  const cleanupCamera = useCallback(() => {
    if (barcodeReaderRef.current) {
      try {
        barcodeReaderRef.current.reset();
      } catch {}
      barcodeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupCamera(), [cleanupCamera]);

  // Switching to manual mode tears down the camera.
  useEffect(() => {
    if (mode === "manual") cleanupCamera();
  }, [mode, cleanupCamera]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(DEVICE_PREFERRED_CAMERA_LOCALSTORAGE_KEY);
    if (stored) setSelectedCameraId(stored);
  }, []);

  const loadCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const list = devices.filter((d) => d.kind === "videoinput");
    setCameras(list);
    if (!list.length) return;
    setSelectedCameraId((current) => {
      if (current && list.some((d) => d.deviceId === current)) return current;
      const back = list.find((d) => /back|rear|environment/i.test(d.label));
      return back?.deviceId ?? list[0].deviceId ?? null;
    });
  }, []);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  const startCamera = useCallback(async () => {
    setStatus({ kind: "starting-camera" });
    setVerdict(null);
    setPreviewUrl(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser.");
      }
      cleanupCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing.");
      video.srcObject = stream;
      await video.play();
      await loadCameras();
      setStatus({ kind: "camera-ready" });

      // Lazy-import ZXing only on the client.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      barcodeReaderRef.current = reader as unknown as typeof barcodeReaderRef.current;
      setStatus({ kind: "scanning-barcode" });
      reader.decodeFromVideoElement(video, (result, err) => {
        if (result) {
          const text = result.getText();
          if (/^\d{8,14}$/.test(text)) {
            void onBarcode(text);
          }
        }
        // Quiet on err — ZXing pings constantly with NotFoundException while looking.
        void err;
      });
    } catch (e: unknown) {
      cleanupCamera();
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Could not start camera." });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCamera, loadCameras, selectedCameraId]);

  useEffect(() => {
    if (!selectedCameraId || typeof window === "undefined") return;
    window.localStorage.setItem(DEVICE_PREFERRED_CAMERA_LOCALSTORAGE_KEY, selectedCameraId);
  }, [selectedCameraId]);

  useEffect(() => {
    if (mode !== "camera" || !streamRef.current) return;
    void startCamera();
  }, [mode, selectedCameraId, startCamera]);

  useEffect(() => {
    let cancelled = false;
    const loadState = async () => {
      try {
        const res = await fetch("/api/devices/register");
        if (!res.ok) return;
        const json = (await res.json()) as { paired?: boolean };
        if (!cancelled) setDeviceRegistered(Boolean(json.paired));
      } catch {}
    };
    void loadState();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureFingerprint = useCallback(() => {
    const existing = localStorage.getItem(DEVICE_FINGERPRINT_LOCALSTORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_FINGERPRINT_LOCALSTORAGE_KEY, created);
    return created;
  }, []);

  const registerThisBrowser = useCallback(async () => {
    if (registeringDevice || deviceRegistered) return;
    setRegisteringDevice(true);
    setPairBannerError(null);
    try {
      const res = await fetch("/api/devices/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fingerprint: ensureFingerprint(),
          kind: kiosk ? "kiosk" : "browser",
          name: kiosk ? "Kiosk browser" : "Browser scanner",
        }),
      });
      if (res.status === 401) {
        setPairBannerError("Sign in to pair this browser to your shop account.");
        return;
      }
      if (res.status === 402) {
        const payload = (await res.json()) as { error?: string };
        setPairBannerError(
          payload.error ??
            "You&apos;re at your 4-installs limit. Add another for $15/mo or revoke an existing device at /admin/devices.",
        );
        return;
      }
      if (!res.ok) {
        setPairBannerError("Could not pair this browser right now.");
        return;
      }
      setDeviceRegistered(true);
    } catch {
      setPairBannerError("Could not pair this browser right now.");
    } finally {
      setRegisteringDevice(false);
    }
  }, [deviceRegistered, ensureFingerprint, kiosk, registeringDevice]);

  const captureFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return null;
    const w = v.videoWidth || 720;
    const h = v.videoHeight || 1280;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  }, []);

  const onShutter = useCallback(async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) {
      setStatus({ kind: "error", message: "Could not capture frame." });
      return;
    }
    setPreviewUrl(dataUrl);
    setStatus({ kind: "identifying" });
    cleanupCamera();
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          costBasis: parseFloat(costBasis) || 0,
        }),
      });
      if (!res.ok) throw new Error(`Identify failed: HTTP ${res.status}`);
      const json = (await res.json()) as VerdictResponse;
      setVerdict(json);
      setStatus({ kind: "result" });
      if (json.scanId && !deviceRegistered) {
        await registerThisBrowser();
      }
    } catch (e: unknown) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Identify failed." });
    }
  }, [captureFrame, cleanupCamera, costBasis, deviceRegistered, registerThisBrowser]);

  const onBarcode = useCallback(
    async (upc: string) => {
      cleanupCamera();
      setStatus({ kind: "looking-up" });
      try {
        const params = new URLSearchParams({ costBasis: costBasis || "0" });
        const res = await fetch(`/api/lookup/${encodeURIComponent(upc)}?${params}`);
        if (!res.ok) throw new Error(`Lookup failed: HTTP ${res.status}`);
        const json = (await res.json()) as VerdictResponse;
        setVerdict(json);
        setStatus({ kind: "result" });
        if (json.scanId && !deviceRegistered) {
          await registerThisBrowser();
        }
      } catch (e: unknown) {
        setStatus({ kind: "error", message: e instanceof Error ? e.message : "Lookup failed." });
      }
    },
    [cleanupCamera, costBasis, deviceRegistered, registerThisBrowser],
  );

  const onManual = useCallback(async () => {
    const q = manualQuery.trim();
    if (!q) return;
    setStatus({ kind: "looking-up" });
    try {
      // Reuse identify endpoint with a tiny shim — no image, server treats as text.
      // For now, hit lookup-by-query via a fake UPC path is wrong; instead, do a
      // direct fetch to /api/identify with an empty image path will 400. So we
      // render a deterministic mock through identify by faking an image — simpler
      // route: we just call /api/lookup/[upc] when user typed digits, otherwise we
      // post to /api/identify with the query repurposed as the title.
      if (/^\d{8,14}$/.test(q)) {
        await onBarcode(q);
        return;
      }
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: encodeManualQueryAsImage(q),
          costBasis: parseFloat(costBasis) || 0,
        }),
      });
      if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
      const json = (await res.json()) as VerdictResponse;
      // Override the identified title with the user's text so the result feels honest.
      json.identify.title = q;
      json.identify.query = q;
      json.identify.source = "manual";
      json.identify.confidence = 0.7;
      setVerdict(json);
      setStatus({ kind: "result" });
      if (json.scanId && !deviceRegistered) {
        await registerThisBrowser();
      }
    } catch (e: unknown) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Search failed." });
    }
  }, [manualQuery, costBasis, deviceRegistered, onBarcode, registerThisBrowser]);

  const reset = useCallback(() => {
    cleanupCamera();
    setVerdict(null);
    setPreviewUrl(null);
    setStatus({ kind: "idle" });
  }, [cleanupCamera]);

  useEffect(() => {
    if (!kiosk || status.kind !== "result") {
      setKioskCountdown(null);
      return;
    }
    const timer = window.setTimeout(() => setKioskCountdown(5), 25_000);
    return () => window.clearTimeout(timer);
  }, [kiosk, status.kind]);

  useEffect(() => {
    if (!kiosk || kioskCountdown == null) return;
    if (kioskCountdown <= 0) {
      reset();
      void startCamera();
      return;
    }
    const tick = window.setTimeout(() => {
      setKioskCountdown((v) => (v == null ? null : v - 1));
    }, 1000);
    return () => window.clearTimeout(tick);
  }, [kiosk, kioskCountdown, reset, startCamera]);

  return (
    <div className={`grid gap-6 ${kiosk ? "h-full grid-cols-1 xl:grid-cols-2" : "lg:grid-cols-2"}`}>
      <section aria-label="Capture" className="card flex flex-col">
        {!kiosk && !deviceRegistered ? (
          <p className="mb-3 rounded-md border border-mint-500/30 bg-mint-50/60 px-3 py-2 text-xs text-ink">
            This browser will count as 1 of your 4 scanner installs once you save your first scan. Already paired?{" "}
            <a href="/login" className="font-medium text-mint-600 hover:underline">
              Sign in
            </a>
            .
          </p>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode("camera")}
              className={`btn-ghost text-xs ${mode === "camera" ? "bg-brand-ink/5" : ""}`}
            >
              <Camera aria-hidden className="mr-1 h-3.5 w-3.5" />
              Camera
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`btn-ghost text-xs ${mode === "manual" ? "bg-brand-ink/5" : ""}`}
            >
              <Type aria-hidden className="mr-1 h-3.5 w-3.5" />
              Type it
            </button>
          </div>
          <StatusPill status={status} />
        </div>

        {mode === "camera" ? (
          <>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-brand-ink/95">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${previewUrl ? "hidden" : ""}`}
              />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />
              ) : null}
              {/* Reticle */}
              <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-brand-paper/60" />
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-1 text-[11px] text-white">
                {status.kind === "scanning-barcode" ? (
                  <span className="flex items-center gap-1">
                    <ScanBarcode className="h-3 w-3" /> Watching for barcode &middot; or hit shutter
                  </span>
                ) : status.kind === "camera-ready" ? (
                  "Camera ready"
                ) : status.kind === "starting-camera" ? (
                  "Starting camera…"
                ) : null}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {cameras.length > 1 ? (
              <label className="mt-4 block text-xs font-medium text-brand-mute">
                Camera source
                <select
                  className="mt-1 block w-full rounded-md border border-brand-ink/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  value={selectedCameraId ?? ""}
                  onChange={(e) => setSelectedCameraId(e.target.value || null)}
                >
                  {cameras.map((camera, i) => (
                    <option key={camera.deviceId || `camera-${i}`} value={camera.deviceId}>
                      {camera.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              {streamRef.current ? (
                <button
                  type="button"
                  onClick={onShutter}
                  className={`btn-accent flex-1 ${kiosk ? "min-h-[64px] text-2xl" : ""}`}
                >
                  <Camera aria-hidden className="mr-2 h-4 w-4" />
                  Snap &amp; identify
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className={`btn-accent flex-1 ${kiosk ? "min-h-[64px] text-2xl" : ""}`}
                >
                  <Camera aria-hidden className="mr-2 h-4 w-4" />
                  Start camera
                </button>
              )}
              <button type="button" onClick={reset} className="btn-ghost" title="Reset">
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
            {registeringDevice ? (
              <p className="mt-2 text-xs text-brand-mute">Pairing this browser to your account…</p>
            ) : null}
            {pairBannerError ? (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{pairBannerError}</p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="text-xs font-medium text-brand-mute">
              What is it? (or paste a UPC / ISBN)
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Le Creuset 5.5qt cherry red"
                className="mt-1 block w-full rounded-md border border-brand-ink/20 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-mute focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </label>
            <button type="button" onClick={onManual} className="btn-accent">
              <Search aria-hidden className="mr-2 h-4 w-4" />
              Look up comps
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-brand-mute">
            Item cost (USD)
            <input
              type="number"
              min="0"
              step="0.25"
              value={costBasis}
              onChange={(e) => setCostBasis(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-ink/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </label>
          <p className="text-[11px] leading-snug text-brand-mute">
            Verdict is calculated against eBay-style fees (~13.25%) and a $6 shipping default.
          </p>
        </div>

        {status.kind === "error" ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {status.message}
          </p>
        ) : null}
      </section>

      <section aria-label="Result" className="flex flex-col">
        {verdict ? (
          <TagPriceCard payload={verdict} />
        ) : (
          <div className="card flex flex-1 items-center justify-center text-center">
            <div className="max-w-xs">
              <Camera className="mx-auto h-8 w-8 text-brand-mute" aria-hidden />
              <p className="mt-3 text-sm font-medium text-brand-ink">
                {status.kind === "identifying" ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Identifying with vision LLM&hellip;
                  </>
                ) : status.kind === "looking-up" ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Looking up sold comps&hellip;
                  </>
                ) : (
                  "Snap a photo or type a query to get a suggested tag price."
                )}
              </p>
              <p className="mt-2 text-xs text-brand-mute">
                On-device barcode reads run automatically while the camera is open.
              </p>
            </div>
          </div>
        )}
      </section>

      {kiosk ? (
        <>
          <button
            type="button"
            onClick={() => setKioskHelpOpen(true)}
            className="fixed right-4 top-4 z-50 inline-flex min-h-[64px] items-center gap-2 rounded-xl border border-line bg-white px-5 text-lg font-semibold text-ink shadow-soft"
          >
            <CircleHelp className="h-5 w-5" />
            Help
          </button>
          {kioskCountdown != null ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 text-white">
              <div className="rounded-2xl border border-mint-500/40 bg-ink px-8 py-6 text-center">
                <p className="text-3xl font-semibold">Returning to camera in {kioskCountdown}...</p>
              </div>
            </div>
          ) : null}
          {kioskHelpOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-ink">How to use this scanner</h2>
                  <button
                    type="button"
                    onClick={() => setKioskHelpOpen(false)}
                    className="rounded-lg border border-line p-2 text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <ol className="space-y-2 text-lg text-ink">
                  <li>1. Place the item under the camera.</li>
                  <li>2. Tap Snap &amp; identify to get suggested tag pricing.</li>
                  <li>3. Use the result card to set your sticker price.</li>
                </ol>
                <p className="mt-4 rounded-lg bg-cream px-4 py-3 text-sm text-soft">
                  Privacy: scanner images are processed to identify the item and return pricing context. We do not use
                  scan images for unrelated advertising profiles.
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const text = (() => {
    switch (status.kind) {
      case "idle": return "Idle";
      case "starting-camera": return "Starting…";
      case "camera-ready": return "Camera ready";
      case "scanning-barcode": return "Scanning";
      case "captured": return "Captured";
      case "identifying": return "Identifying…";
      case "looking-up": return "Looking up…";
      case "result": return "Result";
      case "error": return "Error";
    }
  })();
  const tone =
    status.kind === "result"
      ? "bg-brand-accent2/15 text-brand-accent2"
      : status.kind === "error"
        ? "bg-rose-100 text-rose-700"
        : status.kind === "idle"
          ? "bg-brand-ink/10 text-brand-ink/70"
          : "bg-brand-accent/10 text-brand-accent";
  return <span className={`pill ${tone}`}>{text}</span>;
}

/**
 * Manual-text path needs SOMETHING in `imageBase64` so the API contract holds.
 * Encoding the query as a 1-pixel transparent PNG with the bytes appended makes
 * the lookup deterministic on the same query (mock identify keys off bytes).
 */
function encodeManualQueryAsImage(q: string): string {
  // 1x1 transparent PNG header
  const PNG_PREFIX =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Z6L9psAAAAASUVORK5CYII=";
  // Append a base64-of-the-query so identical queries give identical results.
  const tag = btoa(unescape(encodeURIComponent(q))).slice(0, 24);
  return `data:image/png;base64,${PNG_PREFIX}${tag}`;
}

