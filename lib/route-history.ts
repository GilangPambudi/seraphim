const ROUTE_STACK_KEY = "seraphim:route-stack"

function readRouteStack(): string[] {
  try {
    const value = sessionStorage.getItem(ROUTE_STACK_KEY)
    const stack = value ? JSON.parse(value) : []
    return Array.isArray(stack) && stack.every((path) => typeof path === "string") ? stack : []
  } catch {
    return []
  }
}

export function writeRouteStack(stack: string[]) {
  try {
    sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack))
  } catch {
    // Session storage is optional; routing still works without the fallback.
  }
}

export function updateRouteStack(previousPathname: string, pathname: string) {
  const stack = readRouteStack()

  if (stack.at(-2) === pathname) {
    stack.pop()
  } else if (stack.at(-1) !== pathname) {
    stack.push(pathname)
  }

  writeRouteStack(stack.length > 0 ? stack : [previousPathname, pathname])
}

export function hasInternalRouteHistory() {
  return readRouteStack().length > 1
}
