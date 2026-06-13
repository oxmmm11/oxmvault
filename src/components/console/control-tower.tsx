import { useState } from "react";
import type { ContributionState, MiSnapshot, ModelSnapshot, RuntimeSnapshot, WebGpuSnapshot } from "./types";

type ControlTowerProps = {
  contribution: ContributionState;
  localModelReady: boolean;
  localModelStatus: string;
  miScanning: boolean;
  miSnapshot: MiSnapshot;
  modelSnapshot: ModelSnapshot;
  onBindWallet: (address: string) => void;
  onContribute: () => void;
  runtimeSnapshot: RuntimeSnapshot;
  selectedModel: string;
  webgpuSnapshot: WebGpuSnapshot;
};

export function ControlTower({
  contribution,
  localModelReady,
  localModelStatus,
  miScanning,
  miSnapshot,
  modelSnapshot,
  onBindWallet,
  onContribute,
  runtimeSnapshot,
}: ControlTowerProps) {
  const totalProgress = Math.max(miSnapshot.progress, runtimeSnapshot.infer.progress, runtimeSnapshot.train.progress);
  const [walletInput, setWalletInput] = useState("");
  const [binding, setBinding] = useState(false);

  function submitWallet() {
    const value = walletInput.trim();
    if (!value) return;
    onBindWallet(value);
    setWalletInput("");
    setBinding(false);
  }

  function handlePrimaryAction() {
    if (!contribution.walletBound) {
      setBinding(true);
      return;
    }
    onContribute();
  }

  const statusLabel = !contribution.walletBound
    ? "bind"
    : localModelReady
      ? "ready"
      : contribution.contributing
        ? localModelStatus || "loading"
        : "bound";

  return (
    <aside className="hub-tower hub-tower-core">
      <section className="control-card hub-card hub-card-network hub-card-action hub-core-stage-card">
        <div className="hub-core-stage">
          <div className="hub-core-stage-copy">
            <span className="control-kicker">Vault</span>
            <h3>OXMVault Line</h3>
          </div>

          <div className="hub-core-stage-orb" aria-hidden="true">
            <div className="hub-stage-ring hub-stage-ring-a" />
            <div className="hub-stage-ring hub-stage-ring-b" />
            <div className="hub-stage-ring hub-stage-ring-c" />
            <div className="hub-stage-grid" />
            <div className="hub-stage-beam" />
            <div className="hub-stage-core-dot" />
            <div className="hub-stage-noise" />
            <div className="hub-stage-flare" />
            <div className="hub-stage-echo hub-stage-echo-a" />
            <div className="hub-stage-echo hub-stage-echo-b" />
          </div>

          <div className="hub-stage-sidecar">
            <button type="button" className="hub-action-button" onClick={handlePrimaryAction}>
              {!contribution.walletBound
                ? "Contribute"
                : contribution.contributing || miScanning
                  ? localModelReady ? "Ready" : `Linking ${totalProgress}%`
                  : "Contribute"}
            </button>
            {!contribution.walletBound && binding ? (
              <div className="hub-wallet-bind">
                <input
                  value={walletInput}
                  onChange={(event) => setWalletInput(event.target.value)}
                  className="hub-wallet-input"
                  placeholder="Wallet id"
                />
                <button type="button" className="hub-action-button hub-action-button-secondary" onClick={submitWallet}>
                  Bind
                </button>
              </div>
            ) : null}
            <div className="hub-progress-bar"><span style={{ width: `${totalProgress}%` }} /></div>
            <div className="hub-stage-readout">
              <span>infer {runtimeSnapshot.infer.progress}%</span>
              <span>train {runtimeSnapshot.train.progress}%</span>
            </div>
          </div>
        </div>

        <div className="hub-metric-grid-core">
          <div className="hub-metric-row hub-metric-row-featured"><span>wallet</span><strong data-tone="live">{contribution.wallet || "not bound"}</strong></div>
          <div className="hub-metric-row"><span>status</span><strong data-tone="cool">{statusLabel}</strong></div>
          <div className="hub-metric-row"><span>blocks</span><strong data-tone="cool">{contribution.blocksEarned.toFixed(4)} / 537600000</strong></div>
          <div className="hub-metric-row"><span>points</span><strong data-tone="cool">{contribution.points.toFixed(7)} / 2100000</strong></div>
          <div className="hub-metric-row"><span>reward</span><strong data-tone="hot">{contribution.blockReward.toFixed(8)}</strong></div>
          <div className="hub-metric-row"><span>weight</span><strong data-tone="live">x{contribution.weight.toFixed(2)}</strong></div>
          <div className="hub-metric-row"><span>uptime</span><strong data-tone="hot">{contribution.contributedSeconds}s</strong></div>
          <div className="hub-metric-row"><span>cpu</span><strong data-tone="live">{miSnapshot.cores}</strong></div>
          <div className="hub-metric-row"><span>memory</span><strong data-tone="cool">{miSnapshot.memory}</strong></div>
          <div className="hub-metric-row"><span>gpu</span><strong data-tone="hot">{miSnapshot.gpu}</strong></div>
          <div className="hub-metric-row"><span>model</span><strong data-tone="live">{localModelReady ? "browser ready" : contribution.contributing ? (localModelStatus || modelSnapshot.status) : "idle"}</strong></div>
          <div className="hub-metric-row"><span>infer</span><strong data-tone="cool">{runtimeSnapshot.infer.progress}%</strong></div>
          <div className="hub-metric-row"><span>train</span><strong data-tone="hot">{runtimeSnapshot.train.progress}%</strong></div>
        </div>
      </section>
    </aside>
  );
}
