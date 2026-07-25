/**
 * Turns a module id into the `name@path:line` string the runtime stores in a
 * trace frame. Paths are relative to the project root and always use forward
 * slashes, so a trace reads the same on every platform.
 */
import { relative, sep } from 'node:path'

export function cleanId(id: string): string {
  const query = id.indexOf('?')
  return query === -1 ? id : id.slice(0, query)
}

/** Virtual modules have no location a human could open. */
export function isVirtual(id: string): boolean {
  return id.includes('\0')
}

export function displayPath(id: string, root: string): string {
  const file = cleanId(id)
  const rel = relative(root, file)
  return (rel === '' ? file : rel).split(sep).join('/')
}

export function siteOf(path: string, name: string, line: number): string {
  return `${name}@${path}:${line}`
}
