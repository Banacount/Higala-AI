import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/pages/HomePage';

const ChatPage = lazy(() =>
  import('@/pages/ChatPage').then((module) => ({ default: module.ChatPage })),
);
const ToolkitPage = lazy(() =>
  import('@/pages/ToolkitPage').then((module) => ({
    default: module.ToolkitPage,
  })),
);
const MoodPage = lazy(() =>
  import('@/pages/MoodPage').then((module) => ({ default: module.MoodPage })),
);
const ResourcesPage = lazy(() =>
  import('@/pages/ResourcesPage').then((module) => ({
    default: module.ResourcesPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const CommunityPage = lazy(() =>
  import('@/pages/CommunityPage').then((module) => ({
    default: module.CommunityPage,
  })),
);
const CommunityComposePage = lazy(() =>
  import('@/pages/CommunityComposePage').then((module) => ({
    default: module.CommunityComposePage,
  })),
);
const CommunityPostPage = lazy(() =>
  import('@/pages/CommunityPostPage').then((module) => ({
    default: module.CommunityPostPage,
  })),
);
const CommunityModerationPage = lazy(() =>
  import('@/pages/CommunityModerationPage').then((module) => ({
    default: module.CommunityModerationPage,
  })),
);

function PageLoader() {
  return (
    <div className="flex min-h-[55dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-pine-200 border-t-pine-600"
          aria-hidden="true"
        />
        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted">
          Loading…
        </p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="community/new" element={<CommunityComposePage />} />
          <Route
            path="community/moderation"
            element={<CommunityModerationPage />}
          />
          <Route path="community/:postId" element={<CommunityPostPage />} />
          <Route path="toolkit" element={<ToolkitPage />} />
          <Route path="mood" element={<MoodPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
