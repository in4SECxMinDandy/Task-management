import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            padding: 32,
            color: "#111",
            background: "#fff",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Đã xảy ra lỗi khi khởi động ứng dụng
          </h1>
          <p style={{ marginBottom: 16, color: "#555" }}>
            Vui lòng chụp màn hình lỗi này và gửi cho quản trị viên.
          </p>
          <pre
            style={{
              background: "#f5f5f5",
              border: "1px solid #ddd",
              padding: 16,
              borderRadius: 8,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              overflow: "auto",
              maxHeight: "60vh",
            }}
          >
            {err.name}: {err.message}
            {err.stack ? `\n\n${err.stack}` : ""}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #d4d4d4",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
