export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .capture-layout {
          display: block !important;
        }
        .capture-main {
          width: 100% !important;
          max-width: none !important;
        }
        .capture-side {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  )
}
