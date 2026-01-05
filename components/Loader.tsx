'use client';

export default function Loader({ label }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '2px solid white',
          borderTopColor: 'transparent',
          display: 'inline-block',
          animation: 'spin 1s linear infinite'
        }}
      />
      {label}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}
