import type { ToolRegistry } from '@service/ai';

export interface RegisterBuiltinOptions {
  /** 默认 false：禁止无沙箱的 file-read / code-run 占位实现 */
  allowUnsafeStubs?: boolean;
}

export function registerBuiltinSkillHandlers(
  registry: ToolRegistry,
  opts?: RegisterBuiltinOptions,
): void {
  registry.registerBuiltin('echo', async (args) => ({
    ok: true,
    echoed: args.message ?? args,
  }));

  if (opts?.allowUnsafeStubs) {
    registry.registerBuiltin('file-read', async (args) => ({
      ok: true,
      path: args.path,
      content: '[stub: file read not implemented]',
    }));
    /** `code-run` 不得注册 builtin：必须由 AgentExecutionService → RunnerExecutionClient → runner.execute（P8） */
  }
}
