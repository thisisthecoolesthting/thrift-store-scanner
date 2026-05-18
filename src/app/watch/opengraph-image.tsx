import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PriceScout - watch the 60-second tour";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #11CB9D 0%, #0F6E56 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 90, fontWeight: 700, color: "white", letterSpacing: -2 }}>PriceScout</div>
        <div style={{ fontSize: 42, color: "rgba(255,255,255,0.9)", marginTop: 20 }}>
          Watch the 60-second tour
        </div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.75)", marginTop: 40 }}>
          Snap - comp - tag price
        </div>
      </div>
    ),
    { ...size },
  );
}
