import path from 'path'

/** Prisma migrate and the company-settings seed, started with node rather than npm. */
export function officeDatabaseCommands(root: string, nodePath: string = process.execPath): Array<{ command: string; args: string[] }> {
  return [
    {
      command: nodePath,
      args: [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
    },
    {
      command: nodePath,
      args: [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(root, 'prisma', 'seed.ts')],
    },
  ]
}
