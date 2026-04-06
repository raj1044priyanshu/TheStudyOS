import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #171521 0%, #2f255e 48%, #0f7c66 100%)",
          padding: "64px",
          color: "#ffffff"
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.82 }}>StudyOS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "860px" }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.02 }}>One calm workspace for focused studying.</div>
          <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.88 }}>
            Generate notes, build plans, test recall, and stay consistent without switching tools.
          </div>
        </div>
        <div style={{ display: "flex", gap: "14px" }}>
          {["Notes", "Quizzes", "Planner", "Focus"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                padding: "14px 22px",
                background: "rgba(255,255,255,0.12)",
                fontSize: 22
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
