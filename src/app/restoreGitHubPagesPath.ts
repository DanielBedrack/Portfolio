export function restoreGitHubPagesPath(location: Location, history: History): void {
  const capturedPath = new URLSearchParams(location.search).get('p')

  if (!capturedPath || !capturedPath.startsWith('/')) return

  history.replaceState(null, '', `/Portfolio${capturedPath}`)
}
