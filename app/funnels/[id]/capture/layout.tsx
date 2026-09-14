export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Desktop-first capture workspace: use the available screen instead of a narrow vertical column. */
        .capture-workspace {
          width: min(100%, 1500px) !important;
          margin: 0 auto !important;
          padding: 28px 32px 48px !important;
          box-sizing: border-box !important;
        }

        .capture-topbar {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: end !important;
          gap: 28px !important;
          margin-bottom: 22px !important;
        }

        .capture-title { min-width: 0 !important; }
        .capture-title h1 { font-size: clamp(28px, 2.4vw, 42px) !important; }
        .capture-title p { max-width: 820px !important; }

        .capture-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        .capture-tabs {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
          margin-bottom: 24px !important;
        }

        .capture-tabs > * {
          justify-content: center !important;
          min-width: 0 !important;
        }

        .capture-layout {
          display: block !important;
          width: 100% !important;
        }

        .capture-main {
          width: 100% !important;
          max-width: none !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          gap: 20px !important;
          align-items: stretch !important;
        }

        .capture-side { display: none !important; }

        .capture-main > .capture-card:nth-child(1),
        .capture-main > .capture-card:nth-child(2) {
          min-width: 0 !important;
          height: 100% !important;
        }

        .capture-main > .capture-card:nth-child(3),
        .capture-main > .capture-info,
        .capture-main > .capture-bottom-actions {
          grid-column: 1 / -1 !important;
          min-width: 0 !important;
        }

        .capture-card {
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .capture-import-row {
          display: grid !important;
          grid-template-columns: minmax(220px, auto) minmax(0, 1fr) !important;
          gap: 16px !important;
          align-items: center !important;
        }

        .capture-file-state { min-width: 0 !important; }

        .capture-settings-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(180px, .7fr) !important;
          gap: 18px !important;
          align-items: end !important;
        }

        .capture-preview-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1.45fr) minmax(360px, .85fr) !important;
          gap: 20px !important;
          align-items: start !important;
        }

        .capture-preview-frame-wrap {
          min-width: 0 !important;
          min-height: 560px !important;
        }

        .capture-preview-frame,
        .capture-empty-preview {
          width: 100% !important;
          min-height: 560px !important;
        }

        .redirect-list {
          min-width: 0 !important;
          max-height: 560px !important;
          overflow: auto !important;
        }

        .redirect-input { min-width: 0 !important; }
        .redirect-input input { min-width: 0 !important; width: 100% !important; }

        .capture-bottom-actions {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 14px !important;
          padding-top: 2px !important;
        }

        @media (min-width: 1500px) {
          .capture-workspace { padding-left: 44px !important; padding-right: 44px !important; }
          .capture-main { gap: 24px !important; }
          .capture-card { border-radius: 18px !important; }
        }

        @media (max-width: 1050px) {
          .capture-workspace { padding: 22px 20px 36px !important; }
          .capture-topbar { grid-template-columns: 1fr !important; align-items: start !important; gap: 16px !important; }
          .capture-actions { justify-content: flex-start !important; }
          .capture-main { grid-template-columns: 1fr !important; }
          .capture-main > .capture-card:nth-child(1),
          .capture-main > .capture-card:nth-child(2),
          .capture-main > .capture-card:nth-child(3),
          .capture-main > .capture-info,
          .capture-main > .capture-bottom-actions { grid-column: 1 !important; }
          .capture-preview-grid { grid-template-columns: 1fr !important; }
          .redirect-list { max-height: none !important; }
        }

        @media (max-width: 720px) {
          .capture-workspace { padding: 16px 14px 28px !important; }
          .capture-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .capture-import-row,
          .capture-settings-grid { grid-template-columns: 1fr !important; }
          .capture-preview-frame-wrap,
          .capture-preview-frame,
          .capture-empty-preview { min-height: 420px !important; }
          .capture-bottom-actions { flex-direction: column-reverse !important; align-items: stretch !important; }
          .capture-bottom-actions > * { width: 100% !important; justify-content: center !important; }
        }

        @media (max-width: 480px) {
          .capture-title h1 { font-size: 26px !important; }
          .capture-actions > * { flex: 1 1 auto !important; justify-content: center !important; }
          .capture-preview-frame-wrap,
          .capture-preview-frame,
          .capture-empty-preview { min-height: 340px !important; }
        }
      `}</style>
      {children}
    </>
  )
}
