import React from 'react';

const shimmerStyle = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

const shimmerDarkStyle = {
  background: 'linear-gradient(90deg, #1a1a3a 25%, #22223e 50%, #1a1a3a 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

const keyframes = `@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;

function Box({ width, height, style, dark }) {
  return <div style={{ width, height, ...(dark ? shimmerDarkStyle : shimmerStyle), ...style }} />;
}

export function SkeletonGalleryCard({ dark = false }) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{ breakInside: 'avoid', marginBottom: 3 }}>
        <Box height={Math.floor(Math.random() * 120) + 160} width="100%" dark={dark} style={{ borderRadius: 0 }} />
      </div>
    </>
  );
}

export function SkeletonFeedCard({ dark = false }) {
  const s = dark ? shimmerDarkStyle : shimmerStyle;
  return (
    <>
      <style>{keyframes}</style>
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${dark ? '#2a2a50' : '#e2e2ee'}`,
        background: dark ? '#12122a' : '#fff',
      }}>
        <Box height={200} width="100%" dark={dark} style={{ borderRadius: 0 }} />
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Box height={14} width="70%" dark={dark} />
          <Box height={12} width="45%" dark={dark} />
        </div>
      </div>
    </>
  );
}

export function SkeletonExploreCard({ dark = false }) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        <Box height={180} width="100%" dark={dark} style={{ borderRadius: 0 }} />
        <div style={{ padding: '10px 12px', background: dark ? '#12122a' : '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Box height={13} width="65%" dark={dark} />
          <Box height={11} width="40%" dark={dark} />
        </div>
      </div>
    </>
  );
}

export function SkeletonListRow({ dark = false }) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{
        display: 'flex', gap: 14, padding: '12px 0',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e2ee'}`,
        alignItems: 'center',
      }}>
        <Box width={72} height={72} dark={dark} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Box height={14} width="60%" dark={dark} />
          <Box height={12} width="40%" dark={dark} />
        </div>
      </div>
    </>
  );
}
