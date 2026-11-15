import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VeloDoc Studio — Swiss Precision Document & PDF Workbench";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#F6F5F1",
          backgroundImage: "radial-gradient(#CBC7BD 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "#141413",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              backgroundColor: "#141413",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F6F5F1",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            V
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            VeloDoc Studio
          </span>
          <span
            style={{
              marginLeft: "12px",
              backgroundColor: "#EDF5F2",
              color: "#1B4D3E",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              border: "1px solid #C4DFD5",
            }}
          >
            100% On-Device WebAssembly
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "900px" }}>
          <h1
            style={{
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#141413",
              margin: 0,
            }}
          >
            Swiss Precision Document Workbench.
          </h1>
          <p style={{ fontSize: "24px", color: "#57554E", margin: 0, lineHeight: 1.4 }}>
            Exact KB/MB binary-search compression, 30-document local batch queue, precision PDF tools &amp; official academic presentation studio. Zero cloud uploads.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #E2DFD7",
            paddingTop: "24px",
            fontSize: "18px",
            color: "#88867E",
          }}
        >
          <span>velodoc-studio.vercel.app</span>
          <span style={{ color: "#D94E28", fontWeight: 600 }}>Zero Server Uploads • Client Side Only</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
