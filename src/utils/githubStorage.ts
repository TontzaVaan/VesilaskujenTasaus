import type { AppData } from '../types';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export const GITHUB_CONFIG_KEY = 'onnenkoukku-github-config';

export function lataaGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GitHubConfig;
  } catch {
    return null;
  }
}

export function tallennaGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

export function poistaGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}

function apiUrl(config: GitHubConfig, endpoint: string): string {
  return `https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`;
}

function headers(config: GitHubConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function githubError(status: number): string {
  if (status === 401) return 'Token virheellinen tai vanhentunut (401)';
  if (status === 403) return 'Ei oikeuksia repositorioon (403)';
  if (status === 404) return 'Repositoriota tai tiedostoa ei löydy (404)';
  if (status === 409) return 'Konflikti: repo on uudempi, lataa ensin GitHubista (409)';
  if (status === 422) return 'Konflikti: väärä tiedoston SHA, lataa ensin GitHubista (422)';
  return `GitHub API virhe (${status})`;
}

async function getCurrentFileSha(config: GitHubConfig): Promise<string | null> {
  const res = await fetch(
    apiUrl(config, `/contents/${config.path}?ref=${encodeURIComponent(config.branch)}`),
    { headers: headers(config) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(githubError(res.status));
  const json = await res.json();
  return json.sha as string;
}

export async function saveToGitHub(
  config: GitHubConfig,
  data: AppData,
  message?: string
): Promise<void> {
  const sha = await getCurrentFileSha(config);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const commitMessage = message ?? `Päivitetty ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  const body: Record<string, unknown> = {
    message: commitMessage,
    content,
    branch: config.branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl(config, `/contents/${config.path}`), {
    method: 'PUT',
    headers: headers(config),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(githubError(res.status));
}

export async function loadFromGitHub(config: GitHubConfig): Promise<AppData> {
  const res = await fetch(
    apiUrl(config, `/contents/${config.path}?ref=${encodeURIComponent(config.branch)}`),
    { headers: headers(config) }
  );
  if (!res.ok) throw new Error(githubError(res.status));
  const json = await res.json();
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  return JSON.parse(decoded) as AppData;
}

export async function listGitHubCommits(config: GitHubConfig): Promise<GitHubCommit[]> {
  const res = await fetch(
    apiUrl(config, `/commits?path=${encodeURIComponent(config.path)}&sha=${encodeURIComponent(config.branch)}&per_page=30`),
    { headers: headers(config) }
  );
  if (!res.ok) throw new Error(githubError(res.status));
  const json = await res.json();
  return (json as Array<{ sha: string; commit: { message: string; author: { date: string; name: string } } }>).map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author.date,
    author: c.commit.author.name,
  }));
}

export async function getDataAtCommit(config: GitHubConfig, commitSha: string): Promise<AppData> {
  const res = await fetch(
    apiUrl(config, `/contents/${config.path}?ref=${commitSha}`),
    { headers: headers(config) }
  );
  if (!res.ok) throw new Error(githubError(res.status));
  const json = await res.json();
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  return JSON.parse(decoded) as AppData;
}
