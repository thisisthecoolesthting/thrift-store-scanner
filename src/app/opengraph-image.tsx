import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PriceScout - snap price post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #11CB9D 0%, #04342C 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700, color: "white", letterSpacing: -2 }}>PriceScout</div>
        <div style={{ fontSize: 40, color: "rgba(255,255,255,0.92)", marginTop: 20 }}>
          Snap. Price. Post.
        </div>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.78)", marginTop: 34 }}>
          Phone + webcam pricing for thrift crews
        </div>
      </div>
    ),
    { ...size },
  );
}
