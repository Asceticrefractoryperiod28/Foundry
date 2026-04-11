import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ConfigService } from '../config/config.service.js';

/** Payload aligned with apps/runner `RunnerExecuteDto` / `runner.execute`. */
export interface RunnerExecuteInput {
  companyId: string;
  runId: string;
  commandLine: string;
  executionTokenId?: string;
  persistent?: boolean;
  actor?: { id: string; roles?: string[] };
}

export interface RunnerExecuteResult {
  ok: true;
  policyDecisionId: string;
  sandboxId: string;
  jobName: string;
  namespace: string;
  mode: 'mock' | 'kubernetes';
}

/**
 * P8.1：统一 Worker → apps/runner 的 `runner.execute` 调用。
 * 不重试（命令非幂等）；超时由 WORKER_RUNNER_EXECUTE_TIMEOUT_MS 控制。
 */
@Injectable()
export class RunnerExecutionClient {
  private readonly logger = new Logger(RunnerExecutionClient.name);

  constructor(
    @Inject('RUNNER_RPC_CLIENT') private readonly runner: ClientProxy,
    private readonly config: ConfigService,
  ) {}

  async execute(input: RunnerExecuteInput): Promise<RunnerExecuteResult> {
    const ms = this.config.getRunnerExecuteTimeoutMs();
    const payload = {
      companyId: input.companyId,
      runId: input.runId,
      commandLine: input.commandLine,
      executionTokenId: input.executionTokenId?.trim() || undefined,
      persistent: input.persistent ?? true,
      actor: input.actor,
    };
    try {
      const result = await firstValueFrom(
        this.runner.send<RunnerExecuteResult>('runner.execute', payload).pipe(timeout(ms)),
      );
      if (!result?.ok) {
        throw new Error('runner.execute returned unexpected payload');
      }
      return result;
    } catch (e: unknown) {
      const msg = this.extractErrorMessage(e);
      this.logger.warn({ msg: 'runner_execute_failed', companyId: input.companyId, runId: input.runId, error: msg });
      throw new Error(`runner.execute failed: ${msg}`);
    }
  }

  private extractErrorMessage(e: unknown): string {
    if (e instanceof RpcException) {
      const err = e.getError();
      if (typeof err === 'string') return err;
      if (err && typeof err === 'object' && 'message' in err) {
        return String((err as { message: unknown }).message);
      }
    }
    if (e && typeof e === 'object' && 'message' in e) {
      return String((e as { message: unknown }).message);
    }
    return String(e);
  }
}
