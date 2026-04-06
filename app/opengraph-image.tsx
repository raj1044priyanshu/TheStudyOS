import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #faf7f1 0%, #efe6ff 55%, #dff4ed 100%)",
          padding: "64px",
          color: "#1e1b2e"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              height: "70px",
              width: "70px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              background: "#7b6cf6",
              color: "white",
              fontSize: "34px",
              fontWeight: 700
            }}
          >
            S
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>StudyOS</span>
            <span style={{ fontSize: 20, color: "#5a556c" }}>Calm study workflow for serious students</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "860px" }}>
          <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.02 }}>Notes, quizzes, plans, and revision in one study workspace.</span>
          <span style={{ fontSize: 28, lineHeight: 1.35, color: "#4b4662" }}>
            A focused platform for planning, learning, active recall, and long-term progress.
          </span>
        </div>

        <div style={{ display: "flex", gap: "18px" }}>
          {["Notes", "Planner", "Quiz", "Revision"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 24px",
                borderRadius: "999px",
                background: "rgba(123, 108, 246, 0.12)",
                fontSize: 22,
                color: "#3e3697"
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
