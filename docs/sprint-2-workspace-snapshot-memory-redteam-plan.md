# Sprint 2 实施计划 — 持久 Workspace、VolumeSnapshot、Memory 绑定、Billing、仪表盘、红队

> **对齐**：根目录 `当前实现对齐检查清单.md` **§3 阶段 2**、`docs/多租户隔离-实施交付物-PR清单-PRD架构K8s与QA.md` 阶段叙述。  
> **前置**：P7（Runner）、P1（存储前缀）、P8（`RunnerExecutionClient` + `code-run` → `runner.execute`）已合并。

---

## 1. 目标与验收（Definition of Done）

| # | 目标 | 验收 |
|---|------|------|
| S2.1 | **SandboxService** 支持 **持久 workspace PVC**，并在 Job 执行前后触发 **VolumeSnapshot**（CoW，依 CSI） | 集成环境：同一 `companyId` 多次执行复用 PVC；快照对象创建成功；失败可观测 |
| S2.2 | **Memory** ingest / search **数据面**与公司 **workspace 卷**（或经 Storage 的等价路径）绑定，禁止「无租户根路径」落盘 | RPC/单测：`companyId` 缺失失败；路径解析走 `companies/{id}/...` + 卷挂载约定文档 |
| S2.3 | **Runner** 在 **`runner.execute`** 创建 Job **前**强制 **`billing.checkAllowance`**（与现有 API RPC 对齐），不足则拒绝执行 | 单测 + 契约测试；错误码与 Worker/网关可解析 |
| S2.4 | **Admin 仪表盘**：公司 **空间概览**（PVC 状态、最近快照、资源占用）+ **一键恢复**（从快照克隆 PVC 或文档化 runbook） | 页面/API 可用；权限仅限平台/公司管理员 |
| S2.5 | **红队**：文档 **`docs/security/tenant-red-team-plan.md`** + 可重复用例（**`rm -rf`**、**symlink 逃逸** 尝试）+ 结果记录 | CI 或 `pnpm` 脚本可跑「模拟」用例；结论写入报告 |

---

## 2. 分阶段交付（建议 2～3 个 PR）

### PR-A：Runner + K8s（快照与 Billing）

**代码**

| 区域 | 文件/目录（预计） |
|------|-------------------|
| Runner 配置 | [`apps/runner/src/config/runner-env.schema.ts`](apps/runner/src/config/runner-env.schema.ts) — 快照 Class、前置 Billing 开关 |
| 执行链 | [`apps/runner/src/execution/execution.service.ts`](apps/runner/src/execution/execution.service.ts) — `billing.checkAllowance` → 再 `getOrCreateSpace` / `runCommand` |
| API 客户端 | [`apps/runner/src/clients/api-rpc.client.module.ts`](apps/runner/src/clients/api-rpc.client.module.ts) — 已存在 `API_RPC_CLIENT` |
| 沙箱 | [`apps/runner/src/sandbox/sandbox.service.ts`](apps/runner/src/sandbox/sandbox.service.ts) — `persistent` / 快照钩子（创建 `VolumeSnapshot` CR） |
| Job | [`apps/runner/src/runtime/gvisor-job.runner.ts`](apps/runner/src/runtime/gvisor-job.runner.ts) — 可选：Job 完成回调触发后置快照 |

**K8s**

| 文件 | 作用 |
|------|------|
| [`infrastructure/k8s/runner/deployment.yaml`](infrastructure/k8s/runner/deployment.yaml) | RBAC：`snapshot.storage.k8s.io` 的 `volumesnapshots` create/get |
| 新建 `infrastructure/k8s/runner/volumesnapshotclass-cow.yaml`（示例名） | 与 CSI 对齐的 `VolumeSnapshotClass`（若集群提供） |
| 新建 `infrastructure/k8s/runner/volumesnapshot-restore-example.yaml` | 示例：从 `VolumeSnapshot` 恢复 PVC（见 §4） |

**测试**

- Runner 单测：mock `billing.checkAllowance`；mock `snapshot` API 或跳过（`RUNNER_EXEC_MODE=mock` 不建快照）。

---

### PR-B：Memory + Storage 绑定

| 区域 | 文件/目录（预计） |
|------|-------------------|
| Memory ingest | [`apps/api/src/modules/memory/`](apps/api/src/modules/memory/) — 确保写入路径仅 `companies/{companyId}/...`；Worker 侧读文件经 `StorageService` |
| RPC | `memory.*` 与 `files.*` 的 `companyId` 校验与文档一致 |
| Worker | [`apps/worker/src/modules/memory/`](apps/worker/src/modules/memory/) — 若有直连路径，统一走 API 或已挂载卷 |

**验收**：`storage-tenant-path` 单测扩展 + Memory 集成测试（若已有 harness）。

---

### PR-C：Admin 仪表盘 + 红队

| 区域 | 文件/目录（预计） |
|------|-------------------|
| API | `admin-dashboard` 或新 `company-space.rpc`：列出 PVC/快照元数据（只读，来源 K8s informer 或异步缓存） |
| Admin UI | [`admin-system/src/pages/`](admin-system/src/pages/) — 「公司空间」页：资源、最后快照时间、恢复按钮 |
| 安全 | **新建** [`docs/security/tenant-red-team-plan.md`](docs/security/tenant-red-team-plan.md) |
| 脚本 | `scripts/red-team-sandbox-scenarios.mjs`（或 `packages/e2e`）— `rm -rf`、symlink 在 **gVisor Job** 内尝试，断言无法越界 |

---

## 3. 文件结构总览（仓库内）

```
apps/runner/src/
  execution/execution.service.ts   # Billing 前置 + 执行
  sandbox/sandbox.service.ts       # PVC + VolumeSnapshot 编排
  runtime/gvisor-job.runner.ts
  config/runner-env.schema.ts

apps/api/src/modules/memory/       # ingest/search 与租户路径
apps/admin-dashboard/ 或 admin-system/  # 公司空间概览

infrastructure/k8s/runner/
  deployment.yaml                  # RBAC 增补
  volumesnapshotclass.yaml         # 示例
  volumesnapshot-restore-example.yaml

docs/security/
  tenant-red-team-plan.md          # 新建

docs/sprint-2-workspace-snapshot-memory-redteam-plan.md  # 本文件
```

---

## 4. K8s：VolumeSnapshot 示例（YAML）

> **说明**：CSI 驱动名、`storageClassName`、注解需按集群替换；以下为 **API 形状** 参考。

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: foundry-workspace-{companyIdShort}-{timestamp}
  namespace: foundry-runner
  labels:
    foundry.io/company-id: "{companyUuid}"
    foundry.io/run-id: "{runId}"
spec:
  volumeSnapshotClassName: csi-hostpath-snapclass   # 替换为集群真实 VSC
  source:
    persistentVolumeClaimName: workspace-{companyIdSafe}
```

**从快照恢复新 PVC（示意）**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: workspace-{companyIdSafe}-restored-{timestamp}
  namespace: foundry-runner
spec:
  dataSource:
    name: foundry-workspace-{companyIdShort}-{snapshotTs}
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: default   # 与快照类兼容
```

Runner 或运维 Job 在「一键恢复」时：创建上列 PVC → 更新后续 Job 挂载该卷（或切换 label）。

---

## 5. QA Checklist 更新（建议追加到 `docs/多租户隔离-实施交付物-PR清单-PRD架构K8s与QA.md` 或独立 `docs/qa/sprint-2-checklist.md`）

| 序号 | 项 | 类型 |
|------|----|------|
| QA-S2-01 | `runner.execute` 在 **allow** 路径下，**Billing 不足** 时返回明确错误且不创建 Job | 自动化 |
| QA-S2-02 | 同一 `companyId` 连续两次执行，**PVC 名称稳定**（或文档化迁移策略） | 手工 |
| QA-S2-03 | `VolumeSnapshot` 在 Job 前/后创建，**带 `foundry.io/company-id` label** | 手工 / 集成 |
| QA-S2-04 | Memory `ingest` 在缺少 `companyId` 时 **400** | 自动化 |
| QA-S2-05 | 管理员页 **仅** 可见授权租户的空间元数据 | 手工 |
| QA-S2-06 | 红队：**Job 内 `rm -rf /workspace`** 仅影响本卷；**symlink 逃逸** 指向宿主机路径时 **失败**（gVisor + readOnlyRoot 策略） | 脚本 + 报告 |

---

## 6. 风险与依赖

- **CSI 快照**：集群需安装支持 **VolumeSnapshot** 的 CSI；无则 Sprint 2 仅文档化 + mock 分支。
- **Billing RPC**：`billing.checkAllowance` 的 `estimatedCost`、与 Runner Job 的 **计费单位** 需与产品对齐。
- **多集群**：`admin-dashboard` 读 K8s 需 in-cluster config 或只读代理，避免把 kubeconfig 下发浏览器。

---

## 7. 参考链接

- 差距报告：`docs/当前对齐差距报告.md`（G4～G6 仍待 Sprint 2）
- P8 计划：`docs/p8-worker-runner-migration-plan.md`
- P7+P1 总结：`docs/p7-runner-p1-storage-implementation-summary.md`
