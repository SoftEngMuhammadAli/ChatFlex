import { Github } from "lucide-react";

const GitHubAuthButton = () => {
  const handleGitHubLogin = () => {
    const clientId = String(import.meta.env.VITE_GITHUB_CLIENT_ID || "").trim();
    if (!clientId) {
      console.error("VITE_GITHUB_CLIENT_ID is missing");
      return;
    }

    const redirectUri = String(
      import.meta.env.VITE_GITHUB_REDIRECT_URI ||
        `${window.location.origin}/login`,
    ).trim();
    const scope = encodeURIComponent("read:user user:email");
    const state = encodeURIComponent(
      Math.random().toString(36).slice(2) + Date.now().toString(36),
    );
    const url =
      `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}&state=${state}`;

    window.location.href = url;
  };

  return (
    <button
      onClick={handleGitHubLogin}
      type="button"
      aria-label="Sign in with GitHub"
      className="theme-secondary-button flex w-full items-center justify-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <Github size={18} />
      <span>GitHub</span>
    </button>
  );
};

export default GitHubAuthButton;
