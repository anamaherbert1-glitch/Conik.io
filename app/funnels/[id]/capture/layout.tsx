export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Capture workspace is a standalone page. Reset the global main styles so the
           nested <main className="capture-main"> does not inherit the dashboard offset. */
        .capture-workspace {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 24px 28px 44px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .capture-workspace .capture-main {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
        }

        .capture-topbar {
          display: flex !important;
          align-items: flex-end !important;
          justify-content: space-between !important;
          gap: 24px !important;
          width: 100% !important;
          margin-bottom: 20px !important;
        }

        .capture-title { min-width: 0 !important; flex: 1 1 auto !important; }
        .capture-title h1 { font-size: clamp(26px, 2.5vw, 38px) !important; line-height: 1.08 !important; }
        .capture-title p { max-width: 760px !important; line-height: 1.55 !important; }

        .capture-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 8px !important;
          flex: 0 0 auto !important;
        }

        .capture-tabs {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 6px !important;
          margin: 0 0 18px !important;
          padding: 5px !important;
          box-sizing: border-box !important;
        }

        .capture-tabs > * {
          min-width: 0 !important;
          justify-content: center !important;
          text-align: center !important;
          white-space: nowrap !important;
        }

        .capture-layout {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .capture-main {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          gap: 16px !important;
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
          border-radius: 14px !important;
        }

        .capture-card-heading { min-width: 0 !important; }
        .capture-card-heading > div:last-child { min-width: 0 !important; }
        .capture-card-heading h2,
        .capture-card-heading p { overflow-wrap: anywhere !important; }

        .capture-import-row {
          display: grid !important;
          grid-template-columns: minmax(210px, .8fr) minmax(0, 1.2fr) !important;
          gap: 12px !important;
          align-items: stretch !important;
          min-width: 0 !important;
        }

        .capture-upload-button,
        .capture-file-state { min-width: 0 !important; }
        .capture-file-state { overflow: hidden !important; }
        .capture-file-state > div { min-width: 0 !important; }
        .capture-file-state b,
        .capture-file-state small { overflow-wrap: anywhere !important; }

        .capture-settings-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(180px, .55fr) !important;
          gap: 16px !important;
          align-items: end !important;
        }

        .capture-preview-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, .85fr) !important;
          gap: 16px !important;
          align-items: start !important;
          min-width: 0 !important;
        }

        .capture-preview-frame-wrap {
          min-width: 0 !important;
          min-height: 520px !important;
          overflow: hidden !important;
        }

        .capture-preview-frame,
        .capture-empty-preview {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          min-height: 520px !important;
        }

        .redirect-list {
          min-width: 0 !important;
          max-height: 520px !important;
          overflow: auto !important;
        }

        .redirect-item,
        .redirect-control,
        .redirect-input { min-width: 0 !important; }
        .redirect-input input { min-width: 0 !important; width: 100% !important; }

        .capture-bottom-actions {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 12px !important;
          padding-top: 0 !important;
        }

        .capture-info { min-width: 0 !important; }

        @media (max-width: 1100px) {
          .capture-workspace { padding: 20px 20px 36px !important; }
          .capture-topbar { align-items: flex-start !important; }
          .capture-preview-grid { grid-template-columns: minmax(0, 1.35fr) minmax(280px, .9fr) !important; }
        }

        @media (max-width: 900px) {
          .capture-topbar { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
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

        @media (max-width: 640px) {
          .capture-workspace { padding: 14px 12px 24px !important; }
          .back { margin-bottom: 18px !important; }
          .capture-title h1 { font-size: 25px !important; }
          .capture-title p { font-size: 11px !important; margin-top: 6px !important; }
          .capture-actions { width: 100% !important; }
          .capture-actions > * { flex: 1 1 0 !important; min-width: 0 !important; }
          .capture-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .capture-import-row,
          .capture-settings-grid { grid-template-columns: 1fr !important; }
          .capture-card { border-radius: 12px !important; }
          .capture-preview-frame-wrap,
          .capture-preview-frame,
          .capture-empty-preview { min-height: 390px !important; }
          .capture-bottom-actions { flex-direction: column-reverse !important; align-items: stretch !important; }
          .capture-bottom-actions > * { width: 100% !important; justify-content: center !important; }
          .redirect-input input { font-size: 11px !important; }
        }

        @media (max-width: 400px) {
          .capture-workspace { padding-left: 10px !important; padding-right: 10px !important; }
          .capture-title h1 { font-size: 23px !important; }
          .capture-preview-frame-wrap,
          .capture-preview-frame,
          .capture-empty-preview { min-height: 330px !important; }
          .capture-actions { flex-direction: column !important; }
          .capture-actions > * { width: 100% !important; }
        }
      `}</style>
      {children}
    </>
  )
}
