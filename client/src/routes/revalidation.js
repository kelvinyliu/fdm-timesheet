export function skipRevalidationOnSearchChange({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
  formMethod,
}) {
  if (formMethod) return defaultShouldRevalidate

  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false
  }

  return defaultShouldRevalidate
}
